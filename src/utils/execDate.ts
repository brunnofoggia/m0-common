export function formatExecDate(dateInput): any {
    const splitter = dateInput.indexOf('T') > -1 ? 'T' : ' ';
    let [date, time] = dateInput.split(splitter);
    if (!time) time = '12:00:00Z';

    date = date.replace(/^([0-9]{4})-?([0-9]{2})-?([0-9]{2})$/, '$1-$2-$3');
    return `${date}T${time}`;
}
