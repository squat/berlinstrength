const ExtractTextPlugin = require('extract-text-webpack-plugin');
const extract = new ExtractTextPlugin({filename: 'bundle.css'});

module.exports = {
    entry: "./src/index.tsx",
    output: {
        filename: "bundle.js",
        path: __dirname + "/dist"
    },

    // Enable sourcemaps for debugging webpack's output.
    devtool: "cheap-module-eval-source-map",

    resolve: {
        // Add '.ts' and '.tsx' as resolvable extensions.
        extensions: [".ts", ".tsx", ".js", ".json"]
    },

    module: {
        rules: [
            // All files with a '.ts' or '.tsx' extension will be handled by 'awesome-typescript-loader'.
            {
                test: /\.tsx?$/,
                loader: "awesome-typescript-loader"
            },

            // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
            {
                enforce: "pre",
                test: /\.js$/,
                loader: "source-map-loader"
            },
            {
                test: /\.css$/,
                use: ExtractTextPlugin.extract({
                    use: [
                        {
                            loader: 'css-loader',
                            options: {
                                importLoaders: 1,
                                sourceMap: true,
                            }
                        },
                        {
                            loader: 'postcss-loader',
                            options: {
                                plugins: [
                                    require('postcss-import')(),
                                    require('postcss-cssnext')(),
                                    require('postcss-extend')(),
                                ],
                                sourceMap: true,
                            }
                        }
                        //{
                            //loader: 'sass-loader',
                            //options: {
                                //sourceMap: true,
                                //outputStyle: 'compressed',
                            //}
                        //},
                    ],
                }),
            }
        ]
    },
    plugins: [
        new ExtractTextPlugin('bundle.css'),
    ]
};
