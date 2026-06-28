export async function onRequest(context) {
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36';

  async function tryFetch(url) {
    try {
      const urlObj = new URL(url);
      const response = await fetch(url, {
        headers: {
          'User-Agent': UA,
          Accept: '*/*',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          Referer: urlObj.origin,
        },
        redirect: 'follow',
      });
      return { success: true, response };
    } catch (error) {
      return { success: false, error };
    }
  }

  // 从query参数获取URL，并还原 ht-tps -> https, ht-tp -> http
  const requestUrl = new URL(context.request.url);
  const rawUrl = requestUrl.searchParams.get('url');

  try {
    if (!rawUrl) {
      return new Response(JSON.stringify({ error: '缺少url参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    let targetUrl = rawUrl.replace('ht-tps://', 'https://').replace('ht-tp://', 'http://');
    let response;

    if (!/^https?:\/\//i.test(targetUrl)) {
      const httpsResult = await tryFetch('https://' + targetUrl);
      if (httpsResult.success) {
        response = httpsResult.response;
      } else {
        const httpResult = await tryFetch('http://' + targetUrl);
        if (httpResult.success) {
          response = httpResult.response;
        } else {
          throw new Error(
            `HTTPS和HTTP请求都失败: ${httpsResult.error.message}, ${httpResult.error.message}`
          );
        }
      }
    } else {
      const result = await tryFetch(targetUrl);
      if (result.success) {
        response = result.response;
      } else {
        throw result.error;
      }
    }

    const contentType = response.headers.get('Content-Type') || '';
    const proxyHeaders = new Headers(response.headers);

    proxyHeaders.set('Access-Control-Allow-Origin', '*');
    proxyHeaders.set('Access-Control-Expose-Headers', '*');
    proxyHeaders.delete('Content-Security-Policy');
    proxyHeaders.delete('X-Frame-Options');
    proxyHeaders.delete('X-Content-Type-Options');

    // 文本类响应（API等）用 arrayBuffer 缓冲读取，dev server 兼容好
    // 二进制响应（文件下载等）用流式转发，避免大文件 OOM
    const isTextBased = /json|text|xml|html|javascript|css|svg/i.test(contentType);

    if (isTextBased) {
      const body = await response.arrayBuffer();
      // 缓冲读取后，原始的长度/编码头不再准确
      for (const h of ['Content-Length', 'Content-Encoding', 'Transfer-Encoding']) {
        proxyHeaders.delete(h);
      }
      return new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: proxyHeaders,
      });
    } else {
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: proxyHeaders,
      });
    }
  } catch (error) {
    let errorMessage = error.message;
    if (error.message.includes("Failed to construct 'URL'")) {
      errorMessage = '无效的URL格式，请检查URL是否正确';
    } else if (error.message.includes('Failed to fetch')) {
      errorMessage = '请求失败，可能是URL不存在或网络问题';
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        originalUrl: rawUrl,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
