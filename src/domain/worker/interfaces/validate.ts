export interface RequiredInterface {
    basePath?: string;
    pathList: string[];
}

export interface RequiredListInterface extends Array<RequiredInterface> {}
