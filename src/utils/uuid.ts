import { version as uuidVersion, validate as uuidValidate, v4 as uuidv4 } from 'uuid';

export function uuidCheck(value: string): boolean {
    try {
        if (value) {
            if (uuidValidate(value) && uuidVersion(value) === 4) {
                return true;
            }
        }
    } catch (err) {
        err;
    }
    return false;
}

export function uuidGenerate(): string {
    const uuid = uuidv4();
    return uuid;
}
