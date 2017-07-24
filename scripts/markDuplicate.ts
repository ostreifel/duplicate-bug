import { WorkItemFormService } from "TFS/WorkItemTracking/Services";

export function toggleDuplicate(targetUrl: string) {
    WorkItemFormService.getService().then((formService) =>
        formService.getId().then((id) => {
            formService.addWorkItemRelations([{
                rel: "Duplicate",
                attributes: {
                    comment: "Detected by the Duplicate Bug extension",
                },
                url: targetUrl,
            }]);
        }),
    );
}
