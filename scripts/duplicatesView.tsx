import * as Q from "q";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { WorkItem } from "TFS/WorkItemTracking/Contracts";
import { addDuplicate } from "./markDuplicate";

class NoMatches extends React.Component<{}, {}> {
    public render() {
        return <div className={"no-results"}>{"No recent unlinked duplicates found"}</div>;
    }
}
class WorkItemMatch extends React.Component<{workitem: WorkItem, refresh: () => void}, {}> {
    public render() {
        const wi = this.props.workitem;
        const uri = VSS.getWebContext().host.uri;
        const project = wi.fields["System.TeamProject"];
        const wiUrl = `${uri}${project}/_workitems?id=${wi.id}&_a=edit&fullScreen=true`;
        return <div className="workitem">
            <span>{(wi.fields.score as number).toFixed(3)}</span>
            <button className="dup-bug-action"
                title={`Mark ${wi.id} as duplicate of this`}
                onClick={() => this.add(true)}
            >
                <img src="img/dupOfBug.png"/>
            </button>
            <button
                className="dup-bug-action"
                title={`Mark this as duplicate of ${wi.id}`}
                onClick={() => this.add(false)}
            >
                <img src="img/dupBug.png"/>
            </button>
            <span className="id">{wi.id}</span>
            <a className="title" href={wiUrl} target="_blank">
                {wi.fields["System.Title"]}
            </a>
        </div>;
    }
    private add(isDuplicateOf: boolean) {
        addDuplicate(this.props.workitem.url, isDuplicateOf).then(
            () => this.props.refresh(),
        );
    }
}

class Matches extends React.Component<{workitems: WorkItem[], refresh: () => void}, {}> {
    public render() {
        return <div className="matches">{
            this.props.workitems.map((wi) => <WorkItemMatch workitem={wi} refresh={this.props.refresh} />)
        }</div>;
    }
}

export function showDuplicates(workitems: WorkItem[], refresh: () => void): Q.IPromise<void> {
    const deferred = Q.defer<void>();
    const view = workitems.length ? <Matches workitems={workitems} refresh={refresh}/> : <NoMatches/>;
    ReactDOM.render(view, $(".results")[0], () => deferred.resolve());
    return deferred.promise;
}
