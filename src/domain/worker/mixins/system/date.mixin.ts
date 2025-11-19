import dayjs from 'dayjs';
import { getDateForTimezone } from 'node-labs/lib/utils';

import { ModuleExecutionInterface } from '../../../../interfaces/moduleExecution.interface';
import { StageStructureProperties } from '../../../../interfaces/stageParts.interface';

export abstract class DateMixin {
    abstract moduleExecution: ModuleExecutionInterface;

    getTimezoneOffset(_customTimezoneOffset = null) {
        const timezoneOffset =
            !_customTimezoneOffset && _customTimezoneOffset !== 0 ? this.project?.config?.timezoneOffset : _customTimezoneOffset;
        return +(timezoneOffset || 0);
    }

    getTimezoneString(_customTimezoneOffset = null, addMinutes = false) {
        const timezoneOffset = this.getTimezoneOffset(_customTimezoneOffset);
        const timezoneData = (timezoneOffset + '').split('');
        timezoneData[1] = timezoneData[1].padStart(2, '0');
        const timezoneString = timezoneData.join('');
        return timezoneString + (addMinutes ? ':00' : '');
    }

    getDate(date: any = undefined, keepLocalTime: boolean = false, _customTimezoneOffset: number | null = null): dayjs.Dayjs {
        (typeof date === 'undefined' || date === null) && (date = this.moduleExecution?.date || new Date());
        const timezoneOffset = this.getTimezoneOffset(_customTimezoneOffset);
        return getDateForTimezone(timezoneOffset, date, keepLocalTime);
    }

    getTimezone() {
        return this.getTimezoneOffset();
    }
}
export interface DateMixin extends StageStructureProperties {}
