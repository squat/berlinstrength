import * as React from 'react';
import { TransitionGroup } from 'react-transition-group';

import { Fade } from './fade';

export const Spinner: React.SFC<{size?: number}> = ({size = 60}) => (
    <svg className="spinner" viewBox="-25 -25 50 50" height={size} width={size}>
        <circle cx="0" cy="0" r="20" fill="none" strokeWidth="5" />
    </svg>
);

type LoadableProps = {
    center?: boolean
    children?: React.ReactNode
    inFlight: boolean
    size?: number
};

export const Loadable: React.SFC<LoadableProps & any> =
    ({center = false, children, inFlight, size, ...props}: LoadableProps & any): JSX.Element => (
    <span {...props}>
        <div className={`transition${inFlight ? ' halfblur' : ''}`}>
            {React.isValidElement(children) ? children : <span/>}
        </div>
        <TransitionGroup>
            <Fade key={inFlight ? 'a' : 'b'}>
                <span
                    className={center ? 'center--xylocal' : ''}
                    style={{display: 'inline-flex'}}
                >
                    {inFlight && <Spinner size={size} />}
                </span>
            </Fade>
        </TransitionGroup>
    </span>
);
