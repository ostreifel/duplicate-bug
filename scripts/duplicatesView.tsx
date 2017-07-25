
import * as React from "react";
import * as ReactDOM from "react-dom";
import { WorkItem } from "TFS/WorkItemTracking/Contracts";
import { addDuplicate } from "./markDuplicate";

class NoMatches extends React.Component<{}, {}> {
    public render() {
        return <div className={"no-results"}>{"No recent unlinked duplicates found"}</div>;
    }
}
class WorkItemMatch extends React.Component<{workitem: WorkItem}, {}> {
    public render() {
        const wi = this.props.workitem;
        const uri = VSS.getWebContext().host.uri;
        const project = wi.fields["System.TeamProject"];
        const wiUrl = `${uri}${project}/_workitems?id=${wi.id}&_a=edit&fullScreen=true`;
        return <div className="workitem">
            <span>{(wi.fields.score as number).toFixed(3)}</span>
            <button className="dup-bug-action" title="Mark as duplicate" onClick={() => this.add()}>
                <img src="img/dupBug.png"/>
            </button>
            <span className="id">{wi.id}</span>
            <a className="title" href={wiUrl} target="_blank">
                {wi.fields["System.Title"]}
            </a>
        </div>;
    }
    private add() {
        addDuplicate(this.props.workitem.url).then(
            () => remove(this.props.workitem.id),
        );
    }
}

class Matches extends React.Component<{workitems: WorkItem[]}, {}> {
    public render() {
        return <div className="matches">{
            this.props.workitems.map((wi) => <WorkItemMatch workitem={wi} />)
        }</div>;
    }
}

let previousWis: WorkItem[] = [];
function remove(wiId: number) {
    showDuplicates(previousWis.filter((wi) => wi.id !== wiId));
}

export function showDuplicates(workitems: WorkItem[]) {
    previousWis = workitems;
    const view = workitems.length ? <Matches workitems={workitems}/> : <NoMatches/>;
    ReactDOM.render(view, $(".results")[0]);
}
