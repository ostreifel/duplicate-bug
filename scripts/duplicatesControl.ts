/// <reference types="vss-web-extension-sdk" />
import {
    IWorkItemFieldChangedArgs,
    IWorkItemLoadedArgs,
    IWorkItemNotificationListener,
} from "TFS/WorkItemTracking/ExtensionContracts";
import { WorkItemFormService } from "TFS/WorkItemTracking/Services";
import { WorkItemIndex } from "./data/WorkItemIndex";
import { showDuplicates } from "./duplicatesView";

const titleField = "System.Title";
export class DuplicatesControl implements Partial<IWorkItemNotificationListener> {
    private index: WorkItemIndex;
    public onLoaded(workItemLoadedArgs: IWorkItemLoadedArgs): void {
        this.index = new WorkItemIndex(workItemLoadedArgs.id);
        if (workItemLoadedArgs.isNew) {
            showDuplicates([]);
        } else {
            WorkItemFormService.getService().then((formService) =>
                formService.getFieldValues([titleField]).then((values) => {
                    this.search(values[titleField] as string);
                }),
            );
        }
        showDuplicates([]);
    }
    public onFieldChanged(fieldChangedArgs: IWorkItemFieldChangedArgs): void {
        if (titleField in fieldChangedArgs.changedFields) {
            this.search(fieldChangedArgs.changedFields[titleField]);
        }
    }

    private search(query: string) {
        this.index.search(query).then((matches) => {
            showDuplicates(matches);
        });
    }

}
