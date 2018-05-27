import * as React from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import * as redux from 'redux';

import { manualScan } from '../actions';
import { All } from '../reducers';
import { Loadable, Spinner } from './loader';

type Dispatch = {
    dispatch: redux.Dispatch<All>
};

const instructions: React.SFC = (props: {inFlight: boolean} & Dispatch) => {
    const click = () => {
        props.dispatch(manualScan('/register', '/'));
        props.dispatch(push('/scan'));
    };
    return (
        <Loadable center={true} className="container center--xy" inFlight={props.inFlight}>
            <h2>
                Scan an ID to get started or <a onClick={click}>add a new client</a>
            </h2>
        </Loadable>
    );
};

const mapInFlightToProps = (state: All, _: {}) => ({
    inFlight: state.scan.inFlight,
});

const mapDispatchToProps = (dispatch: redux.Dispatch<All>) => ({
    dispatch,
});

export const Instructions = connect(mapInFlightToProps, mapDispatchToProps)(instructions);

type manualScanInstructionsProps = {
    inFlight: boolean
    location: Location
};

const manualScanInstructions: React.SFC = (props: manualScanInstructionsProps & Dispatch): JSX.Element => {
    if (location.pathname === '/scan' && !props.inFlight) {
        props.dispatch(manualScan('/register', '/'));
    }
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

const mapStateToProps = (state: All, props: any): manualScanInstructionsProps => ({
    inFlight: state.manualScan.inFlight,
    location: state.router.location || props.location,
});

export const ManualScanInstructions = connect(mapStateToProps, mapDispatchToProps)(manualScanInstructions);
