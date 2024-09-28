import type { RequestHandler } from "express";

interface Resource {
    hash: string;
    data: ArrayBuffer;
}

export function restHandler(_resName: string): RequestHandler {
    const resources: Record<string, Resource> = {};

    const _put: RequestHandler = (req, res, next) => {
        const resId = req.params[0];
        const newData = req.body as ArrayBuffer;
        const newHash = req.header("ETag");
        const oldHash = req.header("If-Match");

        if (!newHash || !newData) {
            res.status(400).send("Data or hash not provided.");
            return;
        }

        if (resources[resId] && resources[resId].hash != oldHash) {
            res.status(409).send("Hash mismatch. Update denied.");
            return;
        }

        resources[resId] = {
            hash: newHash,
            data: newData,
        };

        res.status(200).send(`Resource with ID ${resId} has been upserted.`);
        next();
    };

    const _get: RequestHandler = (req, res, next) => {
        const resId = req.params[0];
        const oldHash = req.header("If-None-Match");

        if (!resources[resId]) {
            res.status(404).send("Not found.");
            return;
        }

        if (resources[resId] && resources[resId].hash == oldHash) {
            res.status(304).send("Not modified.");
            return;
        }

        // TODO: Respect If-None-Match header

        const resource = resources[resId];
        res.header("ETag", resource.hash).header("Content-Type", "application/octet-stream");
        res.status(200).send(resource.data);
        next();
    };

    const _options: RequestHandler = (req, res, next) => {
        const resId = req.params[0];
        delete resources[resId];
        res.status(200).end();
        next();
    };

    const _delete: RequestHandler = (req, res, next) => {
        const resId = req.params[0];
        delete resources[resId];
        res.status(200).end();
        next();
    };

    return (req, res, next) => {
        res.header("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "*");
        res.header("Access-Control-Allow-Methods", "GET, PUT, DELETE, OPTIONS");
        res.header("Access-Control-Allow-Headers", "Content-Type, ETag, If-Match, If-None-Match");
        switch (req.method) {
            case "GET":
                _get(req, res, next);
                break;
            case "PUT":
                _put(req, res, next);
                break;
            case "OPTIONS":
                _options(req, res, next);
                break;
            case "DELETE":
                _delete(req, res, next);
                break;
            default:
                next();
        }
    };
}
