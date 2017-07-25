import * as lunr from "lunr";
import { WorkItem } from "TFS/WorkItemTracking/Contracts";
import { CachedValue } from "./CachedValue";
import { stripHtml } from "./stripHtml";
import { WorkItemStore } from "./WorkItemStore";

const repoSteps = "Microsoft.VSTS.TCM.ReproSteps";
const title = "System.Title";
interface IFieldsDocument {
    id: number;
    [name: string]: string | number;
}

export interface IMatchingWorkItem {
    id: number;
    title: string;
}

const workItemStore = new WorkItemStore();
const cachedIndex = new CachedValue(() => getIndex());
function getIndex() {
    return workItemStore.getWorkItems().then((wis) => {

        const fieldsArr = transformFields(wis);

        const idx = lunr(function(this: lunr.Index) {
            this.field(repoSteps);
            this.field(title, { boost: 10 });
            for (const fields of fieldsArr) {
                this.add(fields);
            }
        });
        return idx;
    });
}
function transformFields(fieldsArr: WorkItem[]): IFieldsDocument[] {
    return fieldsArr.map((wi) => {
        const transformed: IFieldsDocument = {id: wi.id};
        transformed[title] = wi.fields[title] as string;
        if (repoSteps in wi.fields) {
            const value = wi.fields[repoSteps];
            if (typeof value === "string") {
                transformed[repoSteps] = stripHtml(value);
            }
        }
        return transformed;
    });
}
const top = 5;
const scoreThreshold = .4;

export function searchForDuplicates(query: string, excludeIds: number[]): Q.IPromise<WorkItem[]> {
    const excludeMap: {[id: string]: void} = {};
    for (const id of excludeIds) {
        excludeMap[id] = undefined;
    }
    return cachedIndex.getValue().then((index) => {
        const allSearchResults = index.search(query);
        // tslint:disable-next-line:no-console
        console.log("all search results", allSearchResults);
        const results = allSearchResults
            .filter((r) => r.score > scoreThreshold)
            .filter((r) => !(String(r.ref) in excludeMap))
            .slice(0, top);
        return workItemStore.getLookup().then((lookup) => results.map((r) => {
            const wi = lookup[r.ref];
            wi.fields.score = r.score;
            return wi;
        }));
    });
}
