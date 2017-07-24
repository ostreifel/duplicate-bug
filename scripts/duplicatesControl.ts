/// <reference types="vss-web-extension-sdk" />
import {
    IWorkItemFieldChangedArgs,
    IWorkItemLoadedArgs,
    IWorkItemNotificationListener,
} from "TFS/WorkItemTracking/ExtensionContracts";
import { WorkItemIndex } from "./data/WorkItemIndex";
import { WorkItemStore } from "./data/WorkItemStore";

const index = new WorkItemIndex(new WorkItemStore());
export class DuplicatesControl implements Partial<IWorkItemNotificationListener> {
    public onLoaded(workItemLoadedArgs: IWorkItemLoadedArgs): void {
        $(".message").text("Hello from duplicatesControl.ts");
    }
    public onFieldChanged(fieldChangedArgs: IWorkItemFieldChangedArgs): void {
        const titleField = "System.Title";
        if (titleField in fieldChangedArgs.changedFields) {
            index.search(fieldChangedArgs.changedFields[titleField]).then((matches) => {
                $(".message").html("");
                for (const match of matches) {
                    const title = match.fields[titleField];
                    const id = match.id;
                    const text = `${id}: ${title}`;
                    $(".message").append($("<div />").text(text));
                }
            });
        }
    }

}
