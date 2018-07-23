import * as React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import { Link } from 'react-router-dom';
import * as redux from 'redux';

import { goHome } from '../actions';
import { All } from '../reducers';
import { Client, expired, NetworkClient } from '../reducers/client';
import { Avatar } from './avatar';
import { ErrorSuccess } from './register';

type ScanProps = {
    inFlight: boolean
    networkClient: NetworkClient
};

type Actions = {
    goHome: () => redux.AnyAction
};

type Dispatch = {
    actions: Actions
};

type ErrorProps = {
    error: string
};

export const ErrorScan: React.SFC<ErrorProps> = ({error}: ErrorProps) => (
    <ul className="fields">
        <li>
            <span className="field-key field-key--error">Error:</span>
            <span className="field-value">
                {error}
                &nbsp;
                <i className="ex"/>
            </span>
        </li>
    </ul>
);

type SuccessProps = {
    client: Client
    inFlight: boolean
};

const SuccessScan: React.SFC<SuccessProps> = ({client: c, inFlight}: SuccessProps): JSX.Element => {
    if (inFlight) {
        return <div />;
    }
    const d: Date = new Date(c.expiration);
    return (
        <div>
            {c.photo && <Avatar id={c.photo} />}
            <ul className="fields">
                <li>
                    <span className="field-key">Name:</span>
                    <span className="field-value">{c.name}</span>
                </li>
                <li>
                    <span className="field-key">ID:</span>
                    <span className="field-value">{c.bsID}</span>
                </li>
                <li>
                    <span className="field-key">Email:</span>
                    <span className="field-value">{c.email}</span>
                </li>
                <li>
                    <span className="field-key">Debt:</span>
                    <span className="field-value">
                        {`${c.debt ? 'has' : 'no'} debt`}
                        &nbsp;
                        {c.debt ? <i className="ex"/> : <i className="checkmark"/>}
                    </span>
                </li>
                <li>
                    <span className="field-key">Expiration:</span>
                    <span className="field-value">
                        {d.toLocaleDateString('en-GB', {month: '2-digit', day: '2-digit', year: 'numeric'})}
                        &nbsp;
                        {expired(c) ? <i className="ex"/> : <i className="checkmark"/>}
                    </span>
                </li>
                <li>
                    <span className="field-key">RFID:</span>
                    <span className="field-value">{c.id}</span>
                </li>
            </ul>
            <Link to={`/edit/${c.bsID}`}>edit</Link>
        </div>
    );
};

const scan: React.SFC<ScanProps&Dispatch> =
    ({inFlight, networkClient: n, ...props}: ScanProps&Dispatch): JSX.Element => {
    const close = (e: React.MouseEvent<HTMLElement>): void => {
        e.preventDefault();
        props.actions.goHome();
    };
    return (
        <ErrorSuccess close={close} done={n.error !== ''} error={n.error} inFlight={inFlight}>
            <SuccessScan client={n.client} inFlight={n.inFlight}/>
        </ErrorSuccess>
    );
};

const mapStateToProps = (state: All, props: RouteComponentProps<{bsID: string}>): {
    inFlight: boolean,
    networkClient: NetworkClient
} => {
    const n: NetworkClient = state.clients.has(props.match.params.bsID) ?
        state.clients.get(props.match.params.bsID) as NetworkClient :  {} as NetworkClient;
    return {
        inFlight: state.scan.inFlight || n.inFlight,
        networkClient: n,
    };
};

const mapDispatchToProps = (dispatch: redux.Dispatch<redux.AnyAction>) => (
    {actions: redux.bindActionCreators({goHome}, dispatch)}
);

export const ScanView = connect(mapStateToProps, mapDispatchToProps)(scan);
