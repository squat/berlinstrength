import * as React from 'react';
import * as Webcam from 'react-webcam';

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
        const w: JSX.Element = src ? <img className="center--xylocal" src={src} style={{height: size}} /> : (
            <Webcam
                audio={false}
                className="center--xylocal"
                height={size}
                ref={this.setWebcam}
                screenshotFormat="image/png"
            />
        );
        return (
            <div style={{textAlign: 'center'}}>
                <div className="webcam" style={{height: size, width: size}}>
                    {w}
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