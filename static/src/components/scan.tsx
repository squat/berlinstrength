import * as React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import * as redux from 'redux';

import { requestRegister, stopRegister } from '../actions';
import { All } from '../reducers';
import { expired, Register, Scan } from '../reducers/scan';
import { Avatar } from './avatar';
import { ErrorSuccess, TakePhoto } from './register';

type ScanProps = {
    dispatch: redux.Dispatch<All>
    inFlight: boolean
    register: Register
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
    dispatch: redux.Dispatch<All>
    scan: Scan
};

class SuccessScan extends React.Component<SuccessProps, {editing: boolean}> {
    constructor(props: SuccessProps) {
        super(props);
        this.state = {
            editing: false,
        };
    }

    public render() {
        const {dispatch, scan: s} = this.props;
        const d: Date = new Date(s.client.expiration);
        let photo: Blob|null = null;
        const cb = (p: Blob): void => {
            photo = p;
        };
        const submit = (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            dispatch(requestRegister(Object.assign({}, s.client), photo, 'PUT'));
        };

        const Form: JSX.Element = (
            <form onSubmit={submit}>
                <TakePhoto cb={cb} />
                <input type="submit" style={{display: 'block', margin: 'auto'}} value="update" />
            </form>
        );
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
                {this.state.editing && Form}
                <button onClick={this.toggleEdit}>{`${this.state.editing ? 'cancel' : 'edit'}`}</button>
            </div>
        );
    }

    private toggleEdit = (e: React.MouseEvent<HTMLButtonElement>): void => {
        e.preventDefault();
        this.setState({editing: !this.state.editing});
    }
}

const scan: React.SFC<ScanProps> = ({inFlight, scan: s, dispatch, register: r}: ScanProps): JSX.Element => {
    const close = () => dispatch(stopRegister());
    const C: React.ReactNode = s.error !== '' ? <ErrorScan error={s.error} />
        : <SuccessScan dispatch={dispatch} scan={s} />;
    return (
        <ErrorSuccess close={close} done={r.done} error={r.error} inFlight={inFlight}>
            {C}
        </ErrorSuccess>
    );
};

const mapStateToProps = (state: All, props: RouteComponentProps<{bsID: string}>): {
    inFlight: boolean,
    register: Register,
    scan: Scan
} => {
    const s: Scan = state.scan.scans.has(props.match.params.bsID) ?
        state.scan.scans.get(props.match.params.bsID) as Scan :  {} as Scan;
    return {
        inFlight: state.scan.inFlight || state.register.inFlight,
        register: state.register,
        scan: s,
    };
};

const mapDispatchToProps = (dispatch: redux.Dispatch<All>): {dispatch: redux.Dispatch<All>} => ({
    dispatch,
});

export const ScanView = connect(mapStateToProps, mapDispatchToProps)(scan);
