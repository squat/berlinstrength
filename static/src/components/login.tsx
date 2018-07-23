import * as React from 'react';
import { connect } from 'react-redux';
import { Redirect, Route } from 'react-router';
import { TransitionGroup } from 'react-transition-group';
import * as redux from 'redux';

import { logout } from '../actions';
import { All } from '../reducers';
import { User } from '../reducers/user';
import { Fade } from './fade';

const login: React.SFC = ({user, ...props}: ConnectedState & Dispatch) => {
    const click = () => props.actions.logout();
    if (user.email) {
        return <a className="login" onClick={click}>logout</a>;
    }
    return <a className="login" href="/login">login</a>;
};

const authenticatedRoute: React.SFC<UserAny> = ({user, props, location}: UserAny) => {
    const {component: Component, redirect = true, ...rest} = props;
    const render = (p: any): JSX.Element => {
        if (!!redirect) {
            return (
                <div>
                    {user.email === '' && location.pathname !== '/' && <Redirect to="/"/>}
                    <Component {...p}/>
                </div>
            );
        }
        return (
            <TransitionGroup>
                <Fade key={user.email}>
                    {user.email && <Component {...p}/>}
                </Fade>
            </TransitionGroup>
        );
    };
    return <Route {...rest} render={render}/>;
};

type ConnectedState = {
    user: User
};

type UserAny = {
    location: Location
    props: {component: React.ComponentClass} & any
    user: User
};

const mapStateToProps = (state: All): ConnectedState => ({
    user: state.user,
});

const mapUserAny = (state: All, props: any): UserAny => ({
    location: state.router.location || props.location,
    props,
    user: state.user,
});

type Actions = {
    logout: typeof logout
};

type Dispatch = {
    actions: Actions
};

const mapDispatchToProps = (dispatch: redux.Dispatch<redux.AnyAction>): Dispatch => (
    {actions: redux.bindActionCreators({logout}, dispatch)}
);

export const Login = connect(mapStateToProps, mapDispatchToProps)(login);
export const AuthenticatedRoute = connect(mapUserAny, {})(authenticatedRoute);

type AuthenticatedProps = {
    ready: boolean
};

const mapStateToAuthenticatedProps = (state: All): AuthenticatedProps => ({
    ready: state.user.email !== '',
});

const authenticated: React.SFC<AuthenticatedProps> = ({ready, children}): JSX.Element => {
    return ready && React.isValidElement(children) ? children : <span/>;
};

export const Authenticated = connect(mapStateToAuthenticatedProps)(authenticated);

type SheetsReadyProps = {
    ready: boolean
    show: boolean
};

const mapStateToSheetsReadyProps = (state: All): SheetsReadyProps => ({
    ready: state.user.email !== '' && state.setSheet.id !== '',
    show: state.router.location ? state.router.location.pathname !== '/sheets' : true,
});

const sheetsReady: React.SFC<SheetsReadyProps> = ({ready, show, children}): JSX.Element => {
    return ready ? (React.isValidElement(children) ? children : <span/>) :
        (show ? <Redirect to="/sheets"/> : <span/>);
};

export const SheetsReady = connect(mapStateToSheetsReadyProps)(sheetsReady);
