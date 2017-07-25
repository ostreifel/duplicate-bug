/// <reference types="vss-web-extension-sdk" />
import {
    IWorkItemFieldChangedArgs,
    IWorkItemLoadedArgs,
    IWorkItemNotificationListener,
} from "TFS/WorkItemTracking/ExtensionContracts";
import { WorkItemFormService } from "TFS/WorkItemTracking/Services";
import { searchForDuplicates } from "./data/WorkItemIndex";
import { showDuplicates } from "./duplicatesView";
import { getLinkedDuplicatesIds } from "./markDuplicate";

const titleField = "System.Title";
const relatedLinks = "System.RelatedLinks";
export class DuplicatesControl implements Partial<IWorkItemNotificationListener> {
    private wiId: number;
    public onLoaded(workItemLoadedArgs: IWorkItemLoadedArgs): void {
        this.wiId = workItemLoadedArgs.id;
        if (workItemLoadedArgs.isNew) {
            showDuplicates([]);
        } else {
            this.getTitleAndSearch();
        }
        showDuplicates([]);
    }
    public onFieldChanged(fieldChangedArgs: IWorkItemFieldChangedArgs): void {
        if (titleField in fieldChangedArgs.changedFields) {
            this.search(fieldChangedArgs.changedFields[titleField]);
        } else if (relatedLinks in fieldChangedArgs.changedFields) {
            this.getTitleAndSearch();
        }
    }

    private getTitleAndSearch() {
        WorkItemFormService.getService().then((formService) =>
            formService.getFieldValues([titleField]).then((values) => {
                this.search(values[titleField] as string);
            }),
        );
    }

    private search(query: string) {
        getLinkedDuplicatesIds().then((duplicateIds) => {
            searchForDuplicates(query, [this.wiId, ...duplicateIds]).then((matches) => {
                showDuplicates(matches);
            });
        });
    }

}
