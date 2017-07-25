/// <reference types="vss-web-extension-sdk" />
import {
    IWorkItemFieldChangedArgs,
    IWorkItemLoadedArgs,
    IWorkItemNotificationListener,
} from "TFS/WorkItemTracking/ExtensionContracts";
import { WorkItemFormService } from "TFS/WorkItemTracking/Services";
import { searchForDuplicates } from "./data/WorkItemIndex";
import { showDuplicates } from "./duplicatesView";
import { trackEvent } from "./events";
import { getLinkedDuplicatesIds } from "./markDuplicate";
import { Timings } from "./timings";

const titleField = "System.Title";
const relatedLinks = "System.RelatedLinks";
export class DuplicatesControl implements Partial<IWorkItemNotificationListener> {
    private wiId: number;
    public onLoaded(workItemLoadedArgs: IWorkItemLoadedArgs): void {
        const { isNew } = workItemLoadedArgs;
        const timings = new Timings();
        this.wiId = workItemLoadedArgs.id;
        const action = isNew ?
            showDuplicates([], () => this.getTitleAndSearch()) :
            this.getTitleAndSearch();
        action.then(() => {
            timings.measure("totalTime");
            trackEvent(
                "loadGroup",
                {isNew: String(isNew)},
                timings.measurements,
            );
        });
    }
    public onFieldChanged(fieldChangedArgs: IWorkItemFieldChangedArgs): void {
        let action: Q.IPromise<void> | null = null;
        if (titleField in fieldChangedArgs.changedFields) {
            action = this.search(fieldChangedArgs.changedFields[titleField]);
        } else if (relatedLinks in fieldChangedArgs.changedFields) {
            action = this.getTitleAndSearch();
        }
    }

    private getTitleAndSearch(): Q.IPromise<void> {
        return WorkItemFormService.getService().then((formService) =>
            formService.getFieldValues([titleField]).then((values) =>
                this.search(values[titleField] as string),
            ),
        );
    }

    private search(query: string): Q.IPromise<void> {
        return getLinkedDuplicatesIds().then((duplicateIds) =>
            searchForDuplicates(query, [this.wiId, ...duplicateIds]).then((matches) =>
                showDuplicates(matches, () => this.search(query)),
            ),
        );
    }

}
