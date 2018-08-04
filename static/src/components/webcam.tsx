import * as React from 'react';
import * as Webcam from 'react-webcam';

type blobHandler = (b: Blob|null) => any;

type TakePhotoProps = {
    size?: number
    url?: string
    cb?: blobHandler
};

type TakePhotoState = {
    retaking: boolean
    src: string|null
};

export class TakePhoto extends React.Component<TakePhotoProps, TakePhotoState> {
    public static defaultProps: Partial<TakePhotoProps> = {
        size: 300,
    };

    private webcam: Webcam;

    constructor(props: TakePhotoProps) {
        super(props);
        this.state = {
            retaking: this.props.url ? false : true,
            src: null,
        };
    }

    public render() {
        const {size, url} = this.props;
        const {retaking} = this.state;
        const src = this.state.src ? this.state.src : url;
        const buttons: JSX.Element = retaking ?
            (
                <span>
                    {url && <button onClick={this.clear} style={{marginRight: '1em'}}>cancel</button>}
                    <button onClick={this.capture}>take photo</button>
                </span>
            )
            : <button onClick={this.retake}>retake</button>;
        const w: JSX.Element = (
            <Webcam
                audio={false}
                style={{height: '100%', objectFit: 'cover', width: '100%'}}
                ref={this.setWebcam}
                screenshotFormat="image/png"
            />
        );
        return (
            <div style={{textAlign: 'center'}}>
                <div className="webcam" style={{height: size, width: size}}>
                    {src && !retaking && <img src={src} style={{height: '100%', objectFit: 'cover', width: '100%'}} />}
                    {retaking && w}
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
        this.setState({retaking: false, src});
        if (!this.props.cb) {
            return;
        }
        this.toBlob(this.props.cb);
    }

    private toBlob = (f: blobHandler): void => {
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
        t.toBlob((b: Blob): any => {
            f(b);
            this.setState({retaking: false, src: this.state.src});
        });
    }

    private retake = (e: React.MouseEvent<HTMLButtonElement>): void => {
        e.preventDefault();
        this.setState({retaking: true, src: null});
        if (!this.props.cb) {
            return;
        }
        this.props.cb(null);
    }

    private clear = (e: React.MouseEvent<HTMLButtonElement>): void => {
        e.preventDefault();
        this.setState({retaking: false, src: null});
        if (!this.props.cb) {
            return;
        }
        this.props.cb(null);
    }
}
