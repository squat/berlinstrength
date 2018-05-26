import * as React from 'react';
import { connect } from 'react-redux';
import { Redirect } from 'react-router';
import { TransitionGroup } from 'react-transition-group';
import * as Webcam from 'react-webcam';
import * as redux from 'redux';

import { requestRegister, stopRegister } from '../actions';
import { All } from '../reducers';
import { Client, ManualScan, Register, Scan } from '../reducers/scan';
import { Fade } from './fade';
import { Spinner } from './loader';
import { ErrorScan } from './scan';

type Dispatch = {
    dispatch: redux.Dispatch<All>
};

const mapDispatchToProps = (dispatch: redux.Dispatch<All>) => ({
    dispatch,
});

type RegisterProps = {
    client?: Client
    edit: boolean
    location: Location
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
    close(): any
};

export const ErrorSuccess: React.SFC<ErrorSuccessProps> = ({children, inFlight, done, error, close}): JSX.Element => (
    <div>
        <div className={'scan transition' + (inFlight ? ' halfblur' : '')}>
            <a className="dismiss" onClick={close}/>
            <TransitionGroup>
                <Fade key={done ? 'a' : 'b'}>
                    {done ? (error ? <ErrorScan error={error} /> : Check) : children}
                </Fade>
            </TransitionGroup>
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

const register: React.SFC = ({client, edit, manualScan: m, dispatch, location, register: r}:
    RegisterProps & Dispatch) => {
    if (location.pathname === '/register' && !m.id) {
        return <Redirect to="/scan" />;
    }
    let photo: Blob|null = null;
    const cb = (p: Blob): void => {
        photo = p;
    };
    const close = () => dispatch(stopRegister());
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
        c.id = m.id;
        dispatch(requestRegister(c, photo, edit ? 'PUT' : 'POST'));
    };
    const Form: JSX.Element = (
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
            </ul>
            <TakePhoto cb={cb} />
            <input type="submit" style={{display: 'block', margin: 'auto'}} value={edit ? 'update' : 'register'} />
        </form>
    );
    return (
        <ErrorSuccess error={r.error} inFlight={r.inFlight} done={r.done} close={close}>
            {Form}
        </ErrorSuccess>
    );
};

const mapStateToProps = (state: All, props: any): RegisterProps => {
    const c: Client|undefined = state.scan.scans.has(props.match.params.bsID) ?
        (state.scan.scans.get(props.match.params.bsID) as Scan).client : undefined;
    return {
        client: c,
        edit: c ? true : false,
        location: state.router.location || props.location,
        manualScan: state.manualScan,
        register: state.register,
    };
};

export const RegisterForm = connect(mapStateToProps, mapDispatchToProps)(register);

type TakePhotoProps = {
    size?: number
    cb?(photo: Blob): any
};

export class TakePhoto extends React.Component<TakePhotoProps, {src: string|null}> {
    public static defaultProps: Partial<TakePhotoProps> = {
        size: 300,
    };

    private webcam: Webcam;

    constructor(props: TakePhotoProps) {
        super(props);
        this.state = {
            src: null,
        };
    }

    public render() {
        const {size} = this.props;
        const {src} = this.state;
        const buttons: JSX.Element = src ?
            <button onClick={this.clear}>retake</button>
            : <button onClick={this.capture}>take photo</button>;
        return (
            <div style={{textAlign: 'center'}}>
                <div className="webcam" style={{height: size, width: size}}>
                    <Webcam
                        audio={false}
                        className="center--xylocal"
                        height={size}
                        ref={this.setWebcam}
                        screenshotFormat="image/png"
                    />
                    {src && <img className="center--xylocal" src={src} style={{height: size}} />}
                </div>
                <div style={{textAlign: 'center'}}>
                    {buttons}
                </div>
            </div>
        );
    }

    private setWebcam = (webcam: Webcam): void => {
        this.webcam = webcam;
    }

    private capture = (e: React.MouseEvent<HTMLButtonElement>): void => {
        e.preventDefault();
        const src = this.webcam.getScreenshot();
        this.setState({src});
        if (!this.props.cb) {
            return;
        }
        this.toBlob(this.props.cb);
    }

    private toBlob = (f: (photo: Blob) => any): void => {
        const c = this.webcam.getCanvas();
        if (!c) {
            return;
        }
        const ctx = c.getContext('2d');
        if (!ctx) {
            return;
        }
        const t = document.createElement('canvas');
        const m = Math.min(c.width, c.height);
        t.height = m;
        t.width = m;
        const tctx = t.getContext('2d');
        if (!tctx) {
            return;
        }
        tctx.drawImage(c, (c.width - m) / 2, (c.height - m) / 2, m, m, 0, 0, m, m);
        t.toBlob(f);
    }

    private clear = (e: React.MouseEvent<HTMLButtonElement>): void => {
        e.preventDefault();
        this.setState({src: null});
    }
}
