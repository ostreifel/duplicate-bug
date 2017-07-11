///<reference types="vss-web-extension-sdk" />
import { IWorkItemNotificationListener } from "TFS/WorkItemTracking/ExtensionContracts";
import { WorkItemFormService } from "TFS/WorkItemTracking/Services";

// save on ctr + s
$(window).bind("keydown", function (event: JQueryEventObject) {
    if (event.ctrlKey || event.metaKey) {
        if (String.fromCharCode(event.which).toLowerCase() === "s") {
            event.preventDefault();
            WorkItemFormService.getService().then((service) => service.beginSaveWorkItem($.noop, $.noop));
        }
    }
});


const contextData: Partial<IWorkItemNotificationListener> = {
};

// Register context menu action provider
VSS.register(VSS.getContribution().id, contextData);
