export interface RequiredInterface {
    // path
    basePath?: string;
    path?: string;
    // required
    pathList?: string[];
    required?: string[];
}

export interface RequiredListInterface extends Array<Partial<RequiredInterface>> {}
