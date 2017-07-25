import * as Q from "q";
import { WorkItem } from "TFS/WorkItemTracking/Contracts";
import { getClient } from "TFS/WorkItemTracking/RestClient";
import { WorkItemFormService } from "TFS/WorkItemTracking/Services";
import { CachedValue } from "./CachedValue";

const areaPathField = "System.AreaPath";
const witField = "System.WorkItemType";

function getParentAreaPath(areaPath: string) {
    if (!areaPath) {
        return "";
    }
    const match = areaPath.match(/^(.+?)(?:\\[^\\]*)?$/);
    if (!match) {
        return areaPath;
    }
    return match[1];
}

export class WorkItemStore {
    private workItems: { [queryParams: string]: CachedValue<WorkItem[]> } = {};
    private lookups: { [queryParams: string]: CachedValue<{ [id: number]: WorkItem }> } = {};
    public getWorkItems() {
        return this.getQueryParams().then(({
            key,
            areaPath,
            wit,
            }) => {
            if (!(key in this.workItems)) {
                this.workItems[key] = new CachedValue(() => this.fetchAllWorkItems(wit, areaPath));
                this.lookups[key] = new CachedValue(() => this.createLookup(this.workItems[key].getValue()));
            }
            return this.workItems[key].getValue();
        });
    }
    public getLookup(): Q.IPromise<{ [id: number]: WorkItem }> {
        return this.getQueryParams().then(({ key }) => this.lookups[key].getValue());
    }
    private getQueryParams() {
        return WorkItemFormService.getService().then((formService) =>
            formService.getFieldValues([areaPathField, witField]).then(({
                [areaPathField]: areaPath,
                [witField]: wit,
            }) => {
                areaPath = getParentAreaPath(areaPath as string);
                const key = JSON.stringify({ areaPath, wit });
                return { key, areaPath, wit };
            }),
        );
    }
    private createLookup(wiPromise: Q.IPromise<WorkItem[]>): Q.IPromise<{ [id: number]: WorkItem }> {
        return wiPromise.then((wis) => {
            const lookup: { [id: number]: WorkItem } = {};
            for (const wi of wis) {
                lookup[wi.id] = wi;
            }
            return lookup;
        });
    }
    private fetchWorkItemIds(workItemType: string, areaPath: string) {
        const cutoff = new Date();
        cutoff.setMonth(-3);
        const query = `
SELECT
    [System.Id]
FROM workitems
WHERE
    [System.TeamProject] = @project
    AND [System.ChangedDate] > @today - 90
    AND [System.WorkItemType] = '${workItemType}'
    AND [System.AreaPath] UNDER '${areaPath}'
ORDER BY [System.ChangedDate] DESC
        `;
        return getClient().queryByWiql({ query }, VSS.getWebContext().project.id, undefined, undefined, 4000)
            .then((res) => res.workItems.map((wi) => wi.id));
    }
    private fetchAllWorkItems(wit: string, areaPath: string) {
        return this.fetchWorkItemIds(wit, areaPath).then((ids) => this.fetchWorkItems(ids));
    }
    private fetchWorkItems(ids: number[]): Q.IPromise<WorkItem[]> {
        if (ids.length === 0) {
            return Q([]);
        }
        const batch = ids.slice(0, 200);
        const nextBatch = ids.slice(200);
        return Q.all([getClient().getWorkItems(batch), this.fetchWorkItems(nextBatch)])
            .then(([curr, next]) => {
                return [...curr, ...next];
            });
    }
}
