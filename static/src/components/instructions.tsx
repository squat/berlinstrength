import * as React from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import * as redux from 'redux';

import { All } from '../reducers';
import { Feed } from './feed';
import { Loadable } from './loader';

type Dispatch = {
    dispatch: redux.Dispatch<redux.AnyAction>
};

const instructions: React.SFC = (props: {inFlight: boolean} & Dispatch) => {
    const u: string = '/register';
    const click = (e: React.MouseEvent<HTMLElement>): void => {
        e.preventDefault();
        props.dispatch(push(u));
    };
    return (
        <Loadable center={true} className="container" inFlight={props.inFlight}>
            <ul>
                <li><h2>scan an ID or</h2></li>
                <li><h2><a onClick={click} href={u}>add a new client</a></h2></li>
            </ul>
            <Feed/>
        </Loadable>
    );
};

const mapInFlightToProps = (state: All, _: {}) => ({
    inFlight: state.scan.inFlight,
});

const mapDispatchToProps = (dispatch: redux.Dispatch<redux.AnyAction>) => ({
    dispatch,
});

export const Instructions = connect(mapInFlightToProps, mapDispatchToProps)(instructions);
