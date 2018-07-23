import * as React from 'react';
import * as Webcam from 'react-webcam';

type blobHandler = (b: Blob) => any;

type TakePhotoProps = {
    size?: number
    cb?: blobHandler
};

type TakePhotoState = {
    saved: boolean
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
            saved: false,
            src: null,
        };
    }

    public render() {
        const {size} = this.props;
        const {saved, src} = this.state;
        const buttons: JSX.Element = src ?
            <button onClick={this.clear}>retake</button>
            : <button onClick={this.capture}>take photo</button>;
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
                    {src && <img src={src} style={{height: '100%', objectFit: 'cover', width: '100%'}} />}
                    {!saved && w}
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
        this.setState({saved: false, src});
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
            this.setState({saved: true, src: this.state.src});
        });
    }

    private clear = (e: React.MouseEvent<HTMLButtonElement>): void => {
        e.preventDefault();
        this.setState({saved: false, src: null});
    }
}
