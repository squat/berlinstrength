import * as React from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import { TransitionGroup } from 'react-transition-group';
import * as redux from 'redux';

import { clearRegistration, manualScan, requestRegister } from '../actions';
import { All } from '../reducers';
import { Client, NetworkClient, Register } from '../reducers/client';
import { ManualScan } from '../reducers/scan';
import { Fade } from './fade';
import { Loadable } from './loader';
import { ErrorScan } from './scan';
import { TakePhoto } from './webcam';

type Dispatch = {
    dispatch: redux.Dispatch<All>
};

const mapDispatchToProps = (dispatch: redux.Dispatch<All>) => ({
    dispatch,
});

type RegisterProps = {
    client?: Client
    edit: boolean
    manualScan: ManualScan
    register: Register
};

const Check: JSX.Element = (
    <span className="iconcontainer center--xylocal">
        <i className="checkmark"/>
    </span>
);

type ErrorSuccessProps = {
    children?: React.ReactNode
    done: boolean
    inFlight: boolean
    error: string
    close(e: React.MouseEvent<HTMLElement>): void
};

export const ErrorSuccess: React.SFC<ErrorSuccessProps> = ({children, inFlight, done, error, close}): JSX.Element => (
    <Loadable inFlight={inFlight} className="card transition" center={true}>
        <div>
            <a className="dismiss" onClick={close}/>
            <TransitionGroup>
                <Fade classNames="localblur" key={done ? 'a' : 'b'}>
                    {done ? (error ? <ErrorScan error={error} /> : Check) : children}
                </Fade>
            </TransitionGroup>
        </div>
    </Loadable>
);

class RegisterForm extends React.Component<RegisterProps & Dispatch> {
    public render() {
        const {client, edit, manualScan: m, dispatch, register: r} = this.props;
        const rfid: string = m.id ? m.id : client ? client.id : '';
        let photo: Blob|null = null;
        const cb = (p: Blob): void => {
            photo = p;
        };
        const close = (e: React.MouseEvent<HTMLElement>) => {
            e.preventDefault();
            dispatch(push('/'));
        };
        const submit = (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            const f = e.target as HTMLFormElement;
            const c = {} as Client;
            for (let i = 0; i < f.elements.length; i++) {
                switch ((f.elements.item(i) as HTMLInputElement).name) {
                    case 'name':
                        c.name = (f.elements.item(i) as HTMLInputElement).value;
                        break;
                    case 'id':
                        c.bsID = (f.elements.item(i) as HTMLInputElement).value;
                        break;
                    case 'email':
                        c.email = (f.elements.item(i) as HTMLInputElement).value;
                        break;
                    case 'expiration':
                        const d = new Date((f.elements.item(i) as HTMLInputElement).value);
                        c.expiration = d.toISOString();
                        break;
                }
            }
            c.debt = false;
            c.id = rfid;
            dispatch(requestRegister(c, photo, edit ? 'PUT' : 'POST'));
        };
        const rescan = (e: React.MouseEvent<HTMLElement>) => {
            e.preventDefault();
            dispatch(manualScan());
        };

        return (
            <ErrorSuccess error={r.error} inFlight={r.inFlight} done={r.done} close={close}>
                <form onSubmit={submit}>
                    <ul className="fields">
                        <li>
                            <label>
                                <span className="field-key field-key--form">Name:</span>
                                <input
                                    autoFocus={true}
                                    className="field-value"
                                    defaultValue={client ? client.name : ''}
                                    name="name"
                                    placeholder="Berlin Strength"
                                    required={true}
                                    type="text"
                                />
                            </label>
                        </li>
                        <li>
                            <label>
                                <span className="field-key field-key--form">Email:</span>
                                <input
                                    className="field-value"
                                    defaultValue={client ? client.email : ''}
                                    name="email"
                                    placeholder="berlin@strength.de"
                                    required={true}
                                    type="email"
                                />
                            </label>
                        </li>
                        <li>
                            <label>
                                <span className="field-key field-key--form">ID:</span>
                                <input
                                    className="field-value"
                                    defaultValue={client ? client.bsID : ''}
                                    name="id"
                                    placeholder="100"
                                    required={true}
                                    type="text"
                                    disabled={edit}
                                />
                            </label>
                        </li>
                        <li>
                            <label>
                                <span className="field-key field-key--form">Expiration:</span>
                                <input
                                    className="field-value"
                                    defaultValue={client ? client.expiration.split('T')[0] : ''}
                                    name="expiration"
                                    placeholder="01/01/3000"
                                    required={true}
                                    type="date"
                                />
                            </label>
                        </li>
                        <li>
                            <span className="field-key field-key--form">RFID:</span>
                            <Loadable
                             center={true}
                             inFlight={m.inFlight}
                             size={30}
                             style={{display: 'inline-block', position: 'relative'}}
                            >
                                <span className="field-value">
                                    {rfid}{rfid && ' '}<a onClick={rescan}>{rfid ? 'change' : 'scan'}</a>
                                </span>
                            </Loadable>
                        </li>
                    </ul>
                    <TakePhoto cb={cb} />
                    <input
                        type="submit"
                        style={{display: 'block', margin: 'auto'}}
                        value={edit ? 'update' : 'register'}
                    />
                </form>
            </ErrorSuccess>
        );
    }

    public componentWillUnmount() {
        this.props.dispatch(clearRegistration());
    }
}

const mapStateToProps = (state: All, props: any): RegisterProps => {
    const c: Client|undefined = state.clients.has(props.match.params.bsID) ?
        (state.clients.get(props.match.params.bsID) as NetworkClient).client : undefined;
    return {
        client: c,
        edit: c ? true : false,
        manualScan: state.manualScan,
        register: state.register,
    };
};

export const ConnectedRegisterForm = connect(mapStateToProps, mapDispatchToProps)(RegisterForm);
