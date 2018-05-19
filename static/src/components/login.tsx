import * as React from 'react';
import { connect } from 'react-redux';
import { Redirect, Route } from 'react-router';
import { TransitionGroup } from 'react-transition-group';
import * as redux from 'redux';

import { logout } from '../actions';
import { All } from '../reducers';
import { User } from '../reducers/user';
import { Fade } from './fade';

const login: React.SFC = ({user, dispatch}: ConnectedState & ConnectedDispatch) => {
    const click = () => dispatch(logout());
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
    return <Route {...rest} render={render} />;
};

type ConnectedState = {
    children?: React.ReactNode
    user: User
};

type UserAny = {
    location: Location
    props: {component: React.ComponentClass} & any
    user: User
};

const mapStateToProps = (state: All, props: {children?: React.ReactNode}): ConnectedState => ({
    children: props.children,
    user: state.user,
});

const mapUserAny = (state: All, props: any): UserAny => ({
    location: state.router.location || props.location,
    props,
    user: state.user,
});

type ConnectedDispatch = {
    dispatch: redux.Dispatch<All>
};

const mapDispatchToProps = (dispatch: redux.Dispatch<All>): ConnectedDispatch => ({
    dispatch,
});

export const Login = connect(mapStateToProps, mapDispatchToProps)(login);
export const AuthenticatedRoute = connect(mapUserAny, mapDispatchToProps)(authenticatedRoute);
