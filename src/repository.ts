import { existsSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";

export interface Resource {
    hash: string;
    data: ArrayBuffer;
}

export interface Repository<T = Resource> {
    get(id: string): Promise<T | null>;
    put(id: string, resource: T): Promise<void>;
    delete(id: string): Promise<void>;
}

export class FileStorage implements Repository<Resource> {

    constructor(public dataPath: string) { }

    private resolvePaths(id: string) {
        const baseFile = path.resolve(this.dataPath, "./" + id);
        return {
            dataFile: `${baseFile}.data`,
            hashFile: `${baseFile}.hash`,
        }
    }

    public async get(id: string): Promise<Resource | null> {
        const { dataFile, hashFile } = this.resolvePaths(id);
        if (!existsSync(dataFile) || !existsSync(hashFile)) {
            return null;
        }
        return {
            data: await fs.readFile(dataFile),
            hash: (await fs.readFile(hashFile)).toString(),
        };
    }

    public async put(id: string, resource: Resource): Promise<void> {
        const { dataFile, hashFile } = this.resolvePaths(id);
        await fs.mkdir(path.dirname(dataFile), { recursive: true });
        await fs.writeFile(dataFile, new Uint8Array(resource.data));
        await fs.writeFile(hashFile, resource.hash);
    }

    public async delete(id: string): Promise<void> {
        const { dataFile, hashFile } = this.resolvePaths(id);
        await fs.rm(dataFile);
        await fs.rm(hashFile);
    }
}
