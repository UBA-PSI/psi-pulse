export default defineEventHandler((event) => {
    if (event.node.req.url?.startsWith('/api/v1')) {
        setResponseHeaders(event, {
            "Access-Control-Allow-Methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
            // Auth per X-API-KEY-Header, keine Cookies: offen für jede Herkunft, auch file:// (Origin "null")
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": '*',
            "Access-Control-Expose-Headers": '*'
        })
        if (getMethod(event) === 'OPTIONS') {
            event.node.res.statusCode = 204
            event.node.res.statusMessage = "No Content."
            return 'OK'
        }
    }
})
