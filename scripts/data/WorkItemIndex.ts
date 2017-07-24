import * as lunr from "lunr";
import { WorkItem } from "TFS/WorkItemTracking/Contracts";
import { CachedValue } from "./CachedVallue";
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
export class WorkItemIndex {
    constructor(
        private readonly wiId: number,
    ) { }

    public search(query: string): Q.IPromise<WorkItem[]> {
        return cachedIndex.getValue().then((index) => {
            const results = index.search(query)
                .slice(0, 6)
                .filter((r) => Number(r.ref) !== this.wiId)
                .slice(0, 5);
            return workItemStore.getLookup().then((lookup) => results.map((r) => {
                const wi = lookup[r.ref];
                wi.fields.score = r.score;
                return wi;
            }));
        });
    }

}
