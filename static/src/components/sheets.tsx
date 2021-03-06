import * as React from 'react';
import { connect } from 'react-redux';
import { Redirect } from 'react-router';
import * as redux from 'redux';

import { requestSetSheet } from '../actions';
import { All } from '../reducers';
import { Sheet } from '../reducers/sheets';

const sheet: React.SFC = (props: ConnectedState&Dispatch) => {
    const sheets = props.sheets.map((s: Sheet) => {
        const click = (e: React.MouseEvent<HTMLElement>) => {
            e.preventDefault();
            props.actions.requestSetSheet(s.id);
        };
        return (
            <li onClick={click} key={s.id}>
                <a>{s.name}</a>
            </li>
        );
    });
    return (
        <div className="container container--sheets">
            {props.path === '/sheets' && props.setSheet && <Redirect to="/"/>}
            <h2>Please pick a sheet</h2>
            <ul>
                {sheets}
            </ul>
        </div>
    );
};

type ConnectedState = {
    path: string
    setSheet: boolean
    sheets: Sheet[]
};

const mapStateToProps = (state: All, _: {}): ConnectedState => ({
    path: location.pathname,
    setSheet: state.setSheet.id && state.setSheet.id !== '' ? true : false,
    sheets: state.sheets,
});

type Actions = {
    requestSetSheet: (id: string) => Promise<redux.AnyAction>
};

type Dispatch = {
    actions: Actions
};

const mapDispatchToProps = (dispatch: redux.Dispatch<redux.AnyAction>) => (
    {actions: redux.bindActionCreators({requestSetSheet}, dispatch)}
);

export const SheetView = connect(mapStateToProps, mapDispatchToProps)(sheet);
