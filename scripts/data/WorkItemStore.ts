import * as Q from "q";
import { WorkItem } from "TFS/WorkItemTracking/Contracts";
import { getClient } from "TFS/WorkItemTracking/RestClient";
import { WorkItemFormService } from "TFS/WorkItemTracking/Services";
import { CachedValue } from "./CachedVallue";

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
    private fetchAllWorkItems() {
        return WorkItemFormService.getService().then((formService) =>
            formService.getFieldValues([areaPathField, witField]).then(({
                [areaPathField]: areaPath,
                [witField]: wit,
            }) => {
                const parentAreaPath = getParentAreaPath(areaPath as string);
                return this.fetchWorkItemIds(wit, parentAreaPath).then((ids) => this.fetchWorkItems(ids));
            }),
        );

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
