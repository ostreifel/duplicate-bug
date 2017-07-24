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

export class WorkItemIndex {
    public readonly index = new CachedValue(() => this.getIndex());
    constructor(private readonly workItemStore: WorkItemStore) { }

    public search(query: string): Q.IPromise<WorkItem[]> {
        return this.index.getValue().then((index) => {
            const results = index.search(query).slice(0, 5);
            const ids: number[] = results.map((r) => r.ref);
            return this.workItemStore.getLookup().then((lookup) => ids.map((id) => lookup[id]));
        });
    }

    private getIndex() {
        return this.workItemStore.getWorkItems().then((wis) => {

            const fieldsArr = this.transformFields(wis);

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
    private transformFields(fieldsArr: WorkItem[]): IFieldsDocument[] {
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
}
