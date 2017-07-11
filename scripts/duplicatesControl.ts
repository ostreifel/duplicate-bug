///<reference types="vss-web-extension-sdk" />
import { IWorkItemNotificationListener, IWorkItemLoadedArgs } from "TFS/WorkItemTracking/ExtensionContracts";

export class DuplicatesControl implements Partial<IWorkItemNotificationListener> {
    public onLoaded(workItemLoadedArgs: IWorkItemLoadedArgs): void {
        $(".message").text("Hello from duplicatesControl.ts");
    }
}
