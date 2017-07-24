import * as Q from "q";
import { WorkItem } from "TFS/WorkItemTracking/Contracts";
import { getClient } from "TFS/WorkItemTracking/RestClient";
import { CachedValue } from "./CachedVallue";

export class WorkItemStore {
    private workItems = new CachedValue(() => this.fetchAllWorkItems());
    private lookup = new CachedValue(() => this.createLookup());
    public getWorkItems() {
        return this.workItems.getValue();
    }
    public getLookup() {
        return this.lookup.getValue();
    }
    private createLookup(): Q.IPromise<{[id: number]: WorkItem}> {
        return this.workItems.getValue().then((wis) => {
            const lookup: {[id: number]: WorkItem} = {};
            for (const wi of wis) {
                lookup[wi.id] = wi;
            }
            return lookup;
        });
    }
    private fetchWorkItemIds() {
        const cutoff = new Date();
        cutoff.setMonth(-3);
        const query = `
            SELECT
                [System.Id]
            FROM workitems
            WHERE
                [System.TeamProject] = @project
                AND System.CreatedDate > @today - 90
        `;
        return getClient().queryByWiql({ query }, VSS.getWebContext().project.id)
            .then((res) => res.workItems.map((wi) => wi.id));
    }
    private fetchAllWorkItems() {
        return this.fetchWorkItemIds().then((ids) => this.fetchWorkItems(ids));
    }
    private fetchWorkItems(ids: number[]): Q.IPromise<WorkItem[]> {
        if (ids.length === 0) {
            return Q([]);
        }
        const batch = ids.slice(0, 200);
        const nextBatch = ids.slice(200);
        return Q.all([getClient().getWorkItems(batch), this.fetchWorkItems(nextBatch)] )
            .then(([curr, next]) => {
                return [...curr, ...next];
            });
    }
}
