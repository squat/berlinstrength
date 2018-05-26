import * as React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import { Link } from 'react-router-dom';
import { push } from 'react-router-redux';
import * as redux from 'redux';

import { All } from '../reducers';
import { expired, Scan } from '../reducers/scan';
import { Avatar } from './avatar';
import { ErrorSuccess } from './register';

type ScanProps = {
    dispatch: redux.Dispatch<All>
    inFlight: boolean
    scan: Scan
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
    scan: Scan
};

const SuccessScan: React.SFC<SuccessProps> = ({scan: s}: SuccessProps): JSX.Element => {
    const d: Date = new Date(s.client.expiration);
    return (
        <div>
            {s.client.photo && <Avatar id={s.client.photo} />}
            <ul className="fields">
                <li>
                    <span className="field-key">Name:</span>
                    <span className="field-value">{s.client.name}</span>
                </li>
                <li>
                    <span className="field-key">ID:</span>
                    <span className="field-value">{s.client.bsID}</span>
                </li>
                <li>
                    <span className="field-key">Email:</span>
                    <span className="field-value">{s.client.email}</span>
                </li>
                <li>
                    <span className="field-key">Debt:</span>
                    <span className="field-value">
                        {`${s.client.debt ? 'has' : 'no'} debt`}
                        &nbsp;
                        {s.client.debt ? <i className="ex"/> : <i className="checkmark"/>}
                    </span>
                </li>
                <li>
                    <span className="field-key">Expiration:</span>
                    <span className="field-value">
                        {d.toLocaleDateString('en-GB', {month: '2-digit', day: '2-digit', year: 'numeric'})}
                        &nbsp;
                        {expired(s) ? <i className="ex"/> : <i className="checkmark"/>}
                    </span>
                </li>
            </ul>
            <Link to={`/edit/${s.client.bsID}`}>edit</Link>
        </div>
    );
};

const scan: React.SFC<ScanProps> = ({inFlight, scan: s, dispatch}: ScanProps): JSX.Element => {
    const close = () => dispatch(push('/'));
    return (
        <ErrorSuccess close={close} done={s.error !== ''} error={s.error} inFlight={inFlight}>
            <SuccessScan scan={s} />
        </ErrorSuccess>
    );
};

const mapStateToProps = (state: All, props: RouteComponentProps<{bsID: string}>): {
    inFlight: boolean,
    scan: Scan
} => {
    const s: Scan = state.scan.scans.has(props.match.params.bsID) ?
        state.scan.scans.get(props.match.params.bsID) as Scan :  {} as Scan;
    return {
        inFlight: state.scan.inFlight,
        scan: s,
    };
};

const mapDispatchToProps = (dispatch: redux.Dispatch<All>): {dispatch: redux.Dispatch<All>} => ({
    dispatch,
});

export const ScanView = connect(mapStateToProps, mapDispatchToProps)(scan);
