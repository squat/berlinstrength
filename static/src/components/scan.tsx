import * as React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import { push } from 'react-router-redux';
import { TransitionGroup } from 'react-transition-group';
import * as redux from 'redux';

import { All } from '../reducers';
import { expired, Scan } from '../reducers/scan';
import { Avatar } from './avatar';
import { Fade } from './fade';
import { Spinner } from './loader';

type ScanProps = {
    dispatch: redux.Dispatch<All>
    error: string,
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
                        {`${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`}
                        &nbsp;
                        {expired(s) ? <i className="ex"/> : <i className="checkmark"/>}
                    </span>
                </li>
            </ul>
        </div>
    );
};

const scan: React.SFC<ScanProps> = ({inFlight, scan: s, dispatch, error}: ScanProps): JSX.Element => {
    const close = () => dispatch(push('/'));
    const C: React.ReactNode = error !== '' ? <ErrorScan error={error} /> : <SuccessScan scan={s} />;
    const c: string = [
        'scan',
        'transition',
        `${inFlight ? 'halfblur' : ''}`,
    ].join(' ');
    return (
        <div>
            <div className={c}>
                <a className="dismiss" onClick={close}/>
                {C}
            </div>
            <TransitionGroup>
                <Fade key={inFlight ? 'a' : 'b'}>
                    <div className="center--xy">
                        {inFlight && <Spinner />}
                    </div>
                </Fade>
            </TransitionGroup>
        </div>
    );
};

const mapStateToProps = (state: All, props: RouteComponentProps<{bsID: string}>): {
    error: string,
    inFlight: boolean,
    scan: Scan
} => {
    const s: Scan = state.scan.scans.has(props.match.params.bsID) ?
        state.scan.scans.get(props.match.params.bsID) as Scan :  {} as Scan;
    return {
        error: s.error,
        inFlight: state.scan.inFlight,
        scan: s,
    };
};

const mapDispatchToProps = (dispatch: redux.Dispatch<All>): {dispatch: redux.Dispatch<All>} => ({
    dispatch,
});

export const ScanView = connect(mapStateToProps, mapDispatchToProps)(scan);
