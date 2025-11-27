import client from "prom-client";

const requestCounter = new client.Counter({
    name: "http_requests_total",
    help: "Total number of HTTP requests",
    labelNames: ["method", "route", "status_code"],
});

const activeRequestsGauge = new client.Gauge({
    name: "http_active_requests",
    help: "Number of active HTTP requests",
});

const responseTimeHistogram = new client.Histogram({
    name: "http_response_time_seconds",
    help: "HTTP response time in seconds",
    labelNames: ["method", "route", "status_code"],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 1.5, 2, 3, 5],
});

export function prometheusMiddleware(req: any, res: any, next: any) {
    const route = req.route ? req.route.path : req.path;
    const method = req.method;

    activeRequestsGauge.inc();

    const end = responseTimeHistogram.startTimer({ method, route });

    res.on("finish", () => {
        const statusCode = res.statusCode;

        requestCounter.inc({ method, route, status_code: statusCode });
        end({ method, route, status_code: statusCode });
        activeRequestsGauge.dec();
    });

    next();
}