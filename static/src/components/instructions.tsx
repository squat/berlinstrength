import * as React from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import { TransitionGroup } from 'react-transition-group';
import * as redux from 'redux';

import { manualScan } from '../actions';
import { All } from '../reducers';
import { Fade } from './fade';
import { Spinner } from './loader';

type Dispatch = {
    dispatch: redux.Dispatch<All>
};

const instructions: React.SFC = (props: {inFlight: boolean} & Dispatch) => {
    const click = () => props.dispatch(push('/scan'));
    return (
        <div>
            <div className={'container center--xy transition' + (props.inFlight ? ' halfblur' : '')}>
                <h2>
                    Scan an ID to get started or <a onClick={click}>add a new client</a>
                </h2>
            </div>
            <TransitionGroup>
                <Fade key={props.inFlight ? 'a' : 'b'}>
                    <div className="center--xy">
                        {props.inFlight && <Spinner />}
                    </div>
                </Fade>
            </TransitionGroup>
        </div>
    );
};

const mapInFlightToProps = (state: All, _: {}) => ({
    inFlight: state.scan.inFlight,
});

const mapDispatchToProps = (dispatch: redux.Dispatch<All>) => ({
    dispatch,
});

export const Instructions = connect(mapInFlightToProps, mapDispatchToProps)(instructions);

const manualScanInstructions: React.SFC<Dispatch> = ({dispatch}: Dispatch) => {
    dispatch(manualScan());
    return (
            <div className="container center--xy">
                <h2>
                    Scan a RFID tag
                </h2>
                <div style={{textAlign: 'center'}}>
                    <Spinner />
                </div>
            </div>
        );
};

export const ManualScanInstructions = connect(null, mapDispatchToProps)(manualScanInstructions);
