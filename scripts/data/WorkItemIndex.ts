import * as lunr from "lunr";
import { WorkItem } from "TFS/WorkItemTracking/Contracts";
import { CachedValue } from "./CachedValue";
import { stripHtml } from "./stripHtml";
import { WorkItemStore } from "./WorkItemStore";

const reproStepsField = "Microsoft.VSTS.TCM.ReproSteps";
const titleField = "System.Title";
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
            this.field(reproStepsField);
            this.field(titleField, { boost: 10 });
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
        transformed[titleField] = wi.fields[titleField] as string;
        if (reproStepsField in wi.fields) {
            const value = wi.fields[reproStepsField];
            if (typeof value === "string") {
                transformed[reproStepsField] = stripHtml(value);
            }
        }
        return transformed;
    });
}
function toQuery(title: string) {
    return title.replace(/[:^*~]/g, "\\\$1");
}

const top = 5;
const scoreThreshold = .4;

export function searchForDuplicates(title: string, excludeIds: number[]): Q.IPromise<WorkItem[]> {
    const excludeMap: {[id: string]: void} = {};
    for (const id of excludeIds) {
        excludeMap[id] = undefined;
    }
    return cachedIndex.getValue().then((index) => {
        const query = toQuery(title);
        const allSearchResults = index.search(query);
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
