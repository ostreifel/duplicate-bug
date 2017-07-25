import { IMeasurements } from "./events";
export class Timings {
    public readonly measurements: IMeasurements = {};
    private start: number;
    private previous;
    public constructor(start?: number) {
        this.start = start || performance.now();
        this.previous = this.start;
    }
    public measure(name: string, sincePrevious = true) {
        const now = performance.now();
        this.measurements[name] = now - (sincePrevious ? this.previous : this.start);
        this.previous = now;
    }
}
