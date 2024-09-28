import type { Request, RequestHandler, Response } from "express";
import { Repository } from "./repository";

type AsyncHandler = (req: Request, res: Response) => Promise<void>;

export function restHandler(repo: Repository): RequestHandler {

    const _put: AsyncHandler = async (req, res) => {
        const resId = req.params[0];
        const newData = req.body as ArrayBuffer;
        const newHash = req.header("ETag");
        const oldHash = req.header("If-Match");

        if (!newHash || !newData) {
            res.status(400).send("Data or hash not provided.");
            return;
        }

        const resource = await repo.get(resId);
        if (resource && resource.hash != oldHash) {
            res.status(409).send("Hash mismatch. Update denied.");
            return;
        }

        await repo.put(resId, {
            hash: newHash,
            data: newData,
        });

        res.status(200).send(`Resource with ID ${resId} has been upserted.`);
    };

    const _get: AsyncHandler = async (req, res) => {
        const resId = req.params[0];
        const oldHash = req.header("If-None-Match");

        const resource = await repo.get(resId);
        if (!resource) {
            res.status(404).send("Not found.");
            return;
        }

        if (resource.hash == oldHash) {
            res.status(304).send("Not modified.");
            return;
        }

        res.header("ETag", resource.hash).header("Content-Type", "application/octet-stream");
        res.status(200).send(resource.data);
    };

    const _options: AsyncHandler = async (_req, res) => {
        res.status(200).end();
    };

    const _delete: AsyncHandler = async (req, res) => {
        const resId = req.params[0];
        await repo.delete(resId);
        res.status(200).end();
    };

    return async (req, res, next) => {
        try {
            res.header("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "*");
            res.header("Access-Control-Allow-Methods", "GET, PUT, DELETE, OPTIONS");
            res.header("Access-Control-Allow-Headers", "Content-Type, ETag, If-Match, If-None-Match");
            switch (req.method) {
                case "GET":
                    await _get(req, res);
                    break;
                case "PUT":
                    await _put(req, res);
                    break;
                case "OPTIONS":
                    await _options(req, res);
                    break;
                case "DELETE":
                    await _delete(req, res);
                    break;
                default:
                    next();
            }
        } catch(err) {
            next(err);
        }
    };
}
