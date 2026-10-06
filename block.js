(function () {
    var wp = window.wp;

    if (!wp || !wp.blocks || !wp.element) {
        return;
    }

    var registerBlockType = wp.blocks.registerBlockType;
    var el = wp.element.createElement;
    var useState = wp.element.useState;
    var TextControl = wp.components.TextControl;
    var ToggleControl = wp.components.ToggleControl;
    var RangeControl = wp.components.RangeControl;
    var ColorPalette = wp.components.ColorPalette;
    var PanelBody = wp.components.PanelBody;
    var Button = wp.components.Button;
    var Spinner = wp.components.Spinner;
    var apiFetch = wp.apiFetch;

    var InspectorControls = (wp.blockEditor && wp.blockEditor.InspectorControls) 
        || (wp.editor && wp.editor.InspectorControls);

    // Itch.io SVG Icon in official #fa5c5c brand color
    var itchIcon = el('svg', { width: 24, height: 24, viewBox: '0 0 24 24', style: { fill: '#fa5c5c' } },
        el('path', {
            d: 'M3.23 3C2.55 3 2 3.55 2 4.23v1.62c0 .48.24.93.63 1.2L4 8.13v9.64C4 18.99 5.01 20 6.23 20h11.54c1.22 0 2.23-1.01 2.23-2.23V8.13l1.37-1.08c.39-.27.63-.72.63-1.2V4.23C22 3.55 21.45 3 20.77 3H3.23zm1.27 2h15v.85l-1.5 1.18-.88-.69L15.62 8 14 6.73 12.38 8 12 8.3 11.62 8 10 6.73 8.38 8l-1.5-1.34-.88.69L4.5 6.18V5zm2.5 5.5h10v6.5H7v-6.5zm2 2v2.5h6V12.5H9z'
        })
    );

    // Itch.io default palette
    var DEFAULT_BG = 'ffffff';
    var DEFAULT_FG = '222222';
    var DEFAULT_LINK = 'fa5c5c';
    var DEFAULT_BORDER = 'dadada';

    function cleanHex(color) {
        return color ? color.replace('#', '') : '';
    }

    registerBlockType('itchio-embed/game-card', {
        title: 'Itch.io Embed',
        description: 'Embed game cards from itch.io with custom theme and color options.',
        icon: itchIcon,
        category: 'text',
        keywords: ['itch', 'itch.io', 'game', 'embed'],
        attributes: {
            url: { type: 'string', default: '' },
            gameId: { type: 'string', default: '' },
            linkText: { type: 'string', default: '' },
            isDark: { type: 'boolean', default: false },
            bgColor: { type: 'string', default: '#ffffff' },
            fgColor: { type: 'string', default: '#222222' },
            linkColor: { type: 'string', default: '#fa5c5c' },
            borderColor: { type: 'string', default: '#dadada' },
            borderWidth: { type: 'number', default: 0 },
            paddingTop: { type: 'number', default: 0 },
            paddingRight: { type: 'number', default: 0 },
            paddingBottom: { type: 'number', default: 0 },
            paddingLeft: { type: 'number', default: 0 },
        },

        edit: function (props) {
            var attributes = props.attributes;
            var setAttributes = props.setAttributes;

            var loadingState = useState(false);
            var isLoading = loadingState[0];
            var setIsLoading = loadingState[1];

            var errorState = useState('');
            var errorMessage = errorState[0];
            var setErrorMessage = errorState[1];

            function fetchItchData() {
                if (!attributes.url) return;

                setIsLoading(true);
                setErrorMessage('');

                apiFetch({
                    path: '/itchio-embed/v1/fetch-data',
                    method: 'POST',
                    data: { url: attributes.url },
                })
                .then(function (response) {
                    setAttributes({
                        gameId: response.id,
                        linkText: response.link_text,
                    });
                    setIsLoading(false);
                })
                .catch(function (err) {
                    setIsLoading(false);
                    setErrorMessage(err.message || 'Error fetching data from itch.io');
                });
            }

            function resetUrl() {
                setAttributes({ gameId: '', url: '', linkText: '' });
            }

            // Build iframe URL query parameters
            var queryParams = [];
            if (attributes.isDark) queryParams.push('dark=true');

            var cleanBg = cleanHex(attributes.bgColor);
            if (cleanBg && cleanBg.toLowerCase() !== DEFAULT_BG) {
                queryParams.push('bg_color=' + cleanBg);
            }

            var cleanFg = cleanHex(attributes.fgColor);
            if (cleanFg && cleanFg.toLowerCase() !== DEFAULT_FG) {
                queryParams.push('fg_color=' + cleanFg);
            }

            var cleanLink = cleanHex(attributes.linkColor);
            if (cleanLink && cleanLink.toLowerCase() !== DEFAULT_LINK) {
                queryParams.push('link_color=' + cleanLink);
            }

            var cleanBorder = cleanHex(attributes.borderColor);
            if (cleanBorder && cleanBorder.toLowerCase() !== DEFAULT_BORDER) {
                queryParams.push('border_color=' + cleanBorder);
            }

            if (attributes.borderWidth) {
                queryParams.push('border_width=' + attributes.borderWidth);
            }

            var embedUrl = 'https://itch.io/embed/' + attributes.gameId;
            if (queryParams.length > 0) {
                embedUrl += '?' + queryParams.join('&');
            }

            var extraBorder = attributes.borderWidth ? attributes.borderWidth * 2 : 0;
            var previewWidth = 552 + extraBorder;
            var previewHeight = 167 + extraBorder;

            var pTop = attributes.paddingTop || 0;
            var pRight = attributes.paddingRight || 0;
            var pBottom = attributes.paddingBottom || 0;
            var pLeft = attributes.paddingLeft || 0;

            // Sidebar Controls (Inspector)
            var sidebarControls = null;
            if (attributes.gameId) {
                sidebarControls = el(
                    InspectorControls,
                    { key: 'inspector' },
                    el(
                        PanelBody,
                        { title: 'Theme Settings', initialOpen: true },
                        el(ToggleControl, {
                            label: 'Dark Theme',
                            help: attributes.isDark ? 'Dark theme enabled' : 'Light theme enabled',
                            checked: !!attributes.isDark,
                            onChange: function (val) {
                                setAttributes({ isDark: val });
                            },
                        })
                    ),
                    el(
                        PanelBody,
                        { title: 'Layout Settings (Padding)', initialOpen: true },
                        el(RangeControl, {
                            label: 'Padding Top (px)',
                            value: attributes.paddingTop,
                            onChange: function (val) {
                                setAttributes({ paddingTop: val || 0 });
                            },
                            min: 0,
                            max: 100,
                        }),
                        el(RangeControl, {
                            label: 'Padding Right (px)',
                            value: attributes.paddingRight,
                            onChange: function (val) {
                                setAttributes({ paddingRight: val || 0 });
                            },
                            min: 0,
                            max: 100,
                        }),
                        el(RangeControl, {
                            label: 'Padding Bottom (px)',
                            value: attributes.paddingBottom,
                            onChange: function (val) {
                                setAttributes({ paddingBottom: val || 0 });
                            },
                            min: 0,
                            max: 100,
                        }),
                        el(RangeControl, {
                            label: 'Padding Left (px)',
                            value: attributes.paddingLeft,
                            onChange: function (val) {
                                setAttributes({ paddingLeft: val || 0 });
                            },
                            min: 0,
                            max: 100,
                        })
                    ),
                    el(
                        PanelBody,
                        { title: 'Color Customization', initialOpen: true },
                        el('p', { style: { fontWeight: 'bold', margin: '0 0 5px 0' } }, 'Background Color'),
                        el(ColorPalette, {
                            value: attributes.bgColor,
                            onChange: function (color) {
                                setAttributes({ bgColor: color || '#ffffff' });
                            },
                        }),
                        el('p', { style: { fontWeight: 'bold', margin: '10px 0 5px 0' } }, 'Text Color'),
                        el(ColorPalette, {
                            value: attributes.fgColor,
                            onChange: function (color) {
                                setAttributes({ fgColor: color || '#222222' });
                            },
                        }),
                        el('p', { style: { fontWeight: 'bold', margin: '10px 0 5px 0' } }, 'Button / Link Color'),
                        el(ColorPalette, {
                            value: attributes.linkColor,
                            onChange: function (color) {
                                setAttributes({ linkColor: color || '#fa5c5c' });
                            },
                        }),
                        el('p', { style: { fontWeight: 'bold', margin: '10px 0 5px 0' } }, 'Border Color'),
                        el(ColorPalette, {
                            value: attributes.borderColor,
                            onChange: function (color) {
                                setAttributes({ borderColor: color || '#dadada' });
                            },
                        }),
                        el(RangeControl, {
                            label: 'Border Width (px)',
                            value: attributes.borderWidth,
                            onChange: function (val) {
                                setAttributes({ borderWidth: val || 0 });
                            },
                            min: 0,
                            max: 10,
                        })
                    ),
                    el(
                        PanelBody,
                        { title: 'Embed Settings', initialOpen: false },
                        el(TextControl, {
                            label: 'Itch.io Page URL',
                            value: attributes.url,
                            onChange: function (val) {
                                setAttributes({ url: val });
                            },
                        }),
                        el('p', { style: { fontSize: '12px', color: '#666', marginBottom: '12px' } }, 
                           'Game ID: ' + attributes.gameId
                        ),
                        el(
                            Button,
                            {
                                isDestructive: true,
                                isSecondary: true,
                                onClick: resetUrl,
                                style: { width: '100%', justifyContent: 'center' }
                            },
                            'Change URL / Reset'
                        )
                    )
                );
            }

            // Main Editor View
            var mainContent;

            if (attributes.gameId && !isLoading) {
                mainContent = el(
                    'div',
                    { 
                        style: { 
                            maxWidth: (previewWidth + pLeft + pRight) + 'px',
                            paddingTop: pTop + 'px',
                            paddingRight: pRight + 'px',
                            paddingBottom: pBottom + 'px',
                            paddingLeft: pLeft + 'px',
                            boxSizing: 'content-box'
                        } 
                    },
                    el('iframe', {
                        key: embedUrl,
                        src: embedUrl,
                        width: previewWidth,
                        height: previewHeight,
                        frameBorder: '0',
                        style: { width: '100%', maxWidth: previewWidth + 'px', border: '0', display: 'block' },
                    })
                );
            } else {
                mainContent = el(
                    'div',
                    { style: { padding: '20px', border: '1px dashed #999', background: '#f9f9f9', maxWidth: '552px' } },
                    el(TextControl, {
                        label: 'Itch.io Page URL',
                        placeholder: 'https://desdinovadev.itch.io/spero-lucem',
                        value: attributes.url,
                        onChange: function (val) {
                            setAttributes({ url: val });
                        },
                    }),
                    el(
                        Button,
                        {
                            isPrimary: true,
                            onClick: fetchItchData,
                            disabled: !attributes.url || isLoading,
                        },
                        isLoading ? 'Fetching data...' : 'Generate Embed'
                    ),
                    isLoading && el(Spinner, { style: { marginLeft: '10px' } }),
                    errorMessage && el('p', { style: { color: '#d94f4f', marginTop: '10px' } }, errorMessage)
                );
            }

            return [sidebarControls, mainContent];
        },

        save: function () {
            return null;
        },
    });
})();