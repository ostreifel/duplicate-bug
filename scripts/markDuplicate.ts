import { WorkItemRelation } from "TFS/WorkItemTracking/Contracts";
import { WorkItemFormService } from "TFS/WorkItemTracking/Services";
import { trackEvent } from "./events";

const duplicate = "System.LinkTypes.Duplicate-Forward";
const duplicateOf = "System.LinkTypes.Duplicate-Reverse";

function idFromUrl(url: string): number {
    const match = url.match(/\d+$/);
    return match ? Number(match[0]) : -1;
}

export function getLinkedDuplicatesIds(): Q.IPromise<number[]> {
    return getDuplicateLinks().then((links) => links.map((link) => idFromUrl(link.url)));
}

function getDuplicateLinks(): Q.IPromise<WorkItemRelation[]> {
    return WorkItemFormService.getService().then((formService) =>
        formService.getId().then((id) =>
            formService.getWorkItemRelations().then((relations) =>
                relations.filter((relation) =>
                    !relation.attributes.isDeleted && (relation.rel === duplicate || relation.rel === duplicateOf),
                ),
            ),
        ),
    );
}

export function addDuplicate(targetUrl: string, isDuplicateOf: boolean = false): Q.IPromise<void> {
    trackEvent("mark", {type: "duplicateOf"});
    return WorkItemFormService.getService().then((formService) =>
        formService.addWorkItemRelations([{
            rel: isDuplicateOf ? duplicateOf : duplicate,
            attributes: {
                comment: "Detected by the Duplicate Bug extension",
            },
            url: targetUrl,
        }]),
    );
}
