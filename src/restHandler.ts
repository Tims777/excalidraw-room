import type { RequestHandler } from "express";

interface Scene {
    hash: string;
    data: ArrayBuffer;
}

export function restHandler(_resourceName: string): RequestHandler {
    const scenes: Record<string, Scene> = {};

    const _put: RequestHandler = (req, res, next) => {
        const sceneId = req.params.id;
        const newSceneData = req.body as ArrayBuffer;
        const newSceneHash = req.header("ETag");
        const oldSceneHash = req.header("If-Match");
        console.log(oldSceneHash, newSceneHash, newSceneData);

        if (!newSceneHash || !newSceneData) {
            res.status(400).send("Data or hash not provided.");
            return;
        }

        if (scenes[sceneId] && scenes[sceneId].hash != oldSceneHash) {
            res.status(409).send("Hash mismatch. Update denied.");
            return;
        }

        scenes[sceneId] = {
            hash: newSceneHash,
            data: newSceneData,
        };

        res.status(200).send(`Scene with ID ${sceneId} has been upserted.`);
        next();
    };

    const _get: RequestHandler = (req, res, next) => {
        const sceneId = req.params.id;
        const oldSceneHash = req.header("If-None-Match");

        if (!scenes[sceneId]) {
            res.status(404).send("Not found.");
            return;
        }

        if (scenes[sceneId] && scenes[sceneId].hash == oldSceneHash) {
            res.status(304).send("Not modified.");
            return;
        }

        // TODO: Respect If-None-Match header

        const scene = scenes[sceneId];
        res.header("ETag", scene.hash).header("Content-Type", "application/octet-stream");
        res.status(200).send(scene.data);
        next();
    };

    const _options: RequestHandler = (req, res, next) => {
        const sceneId = req.params.id;
        delete scenes[sceneId];
        res.status(200).end();
        next();
    };

    const _delete: RequestHandler = (req, res, next) => {
        const sceneId = req.params.id;
        delete scenes[sceneId];
        res.status(200).end();
        next();
    };

    return (req, res, next) => {
        const id = req.params.id;
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
