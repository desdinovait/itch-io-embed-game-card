<?php
/**
 * Plugin Name:       Itch.io Embed Game Card
 * Description:       Embed game cards from itch.io into Gutenberg with custom theme and color options.
 * Version:           1.0.0
 * Requires at least: 5.8
 * Requires PHP:      7.4
 * Author:            Desdinova
 * Author URI:        https://www.desdinova.it
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       itchio-embed-game-card
 * Domain Path:       /languages
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Register block and editor scripts
 */
function itchio_embed_register_block() {
    wp_register_script(
        'itchio-embed-block-editor',
        plugins_url('block.js', __FILE__),
        array('wp-blocks', 'wp-element', 'wp-components', 'wp-editor', 'wp-block-editor', 'wp-api-fetch'),
        (string) filemtime(plugin_dir_path(__FILE__) . 'block.js'), // Versione (convertita in stringa)
        true // $in_footer: carica lo script nel footer
    );

    register_block_type('itchio-embed/game-card', array(
        'editor_script'   => 'itchio-embed-block-editor',
        'render_callback' => 'itchio_embed_render_callback',
        'attributes'      => array(
            'url' => array(
                'type'    => 'string',
                'default' => '',
            ),
            'gameId' => array(
                'type'    => 'string',
                'default' => '',
            ),
            'linkText' => array(
                'type'    => 'string',
                'default' => '',
            ),
            'isDark' => array(
                'type'    => 'boolean',
                'default' => false,
            ),
            'bgColor' => array(
                'type'    => 'string',
                'default' => '#ffffff',
            ),
            'fgColor' => array(
                'type'    => 'string',
                'default' => '#222222',
            ),
            'linkColor' => array(
                'type'    => 'string',
                'default' => '#fa5c5c',
            ),
            'borderColor' => array(
                'type'    => 'string',
                'default' => '#dadada',
            ),
            'borderWidth' => array(
                'type'    => 'number',
                'default' => 0,
            ),
            'paddingTop' => array(
                'type'    => 'number',
                'default' => 0,
            ),
            'paddingRight' => array(
                'type'    => 'number',
                'default' => 0,
            ),
            'paddingBottom' => array(
                'type'    => 'number',
                'default' => 0,
            ),
            'paddingLeft' => array(
                'type'    => 'number',
                'default' => 0,
            ),
        ),
    ));
}
add_action('init', 'itchio_embed_register_block');

/**
 * REST API route to fetch data.json from itch.io
 */
function itchio_embed_register_rest_route() {
    register_rest_route('itchio-embed/v1', '/fetch-data', array(
        'methods'             => 'POST',
        'callback'            => 'itchio_embed_fetch_itch_data',
        'permission_callback' => function () {
            return current_user_can('edit_posts');
        },
    ));
}
add_action('rest_api_init', 'itchio_embed_register_rest_route');

function itchio_embed_fetch_itch_data($request) {
    $url = esc_url_raw($request->get_param('url'));

    if (empty($url)) {
        return new WP_Error('empty_url', 'Invalid URL', array('status' => 400));
    }

    $json_url = rtrim($url, '/') . '/data.json';

    $response = wp_remote_get($json_url, array(
        'timeout'    => 10,
        'user-agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) WordPress-ItchEmbed/1.0',
    ));

    if (is_wp_error($response)) {
        return new WP_Error('fetch_error', $response->get_error_message(), array('status' => 500));
    }

    $body = wp_remote_retrieve_body($response);
    $data = json_decode($body, true);

    if (empty($data) || !isset($data['id'])) {
        return new WP_Error('parse_error', 'Unable to extract ID from JSON', array('status' => 400));
    }

    $title  = isset($data['title']) ? $data['title'] : 'Game on itch.io';
    $author = !empty($data['authors']) && isset($data['authors'][0]['name']) ? $data['authors'][0]['name'] : '';

    $link_text = $title;
    if ($author) {
        $link_text .= ' by ' . $author;
    }

    return array(
        'id'        => (string)$data['id'],
        'title'     => $title,
        'link_text' => $link_text,
    );
}

/**
 * Helper to strip '#' from hex colors
 */
function itchio_clean_hex($color) {
    return ltrim(trim($color), '#');
}

/**
 * Render callback for frontend HTML output
 */
function itchio_embed_render_callback($attributes) {
    if (empty($attributes['gameId']) || empty($attributes['url'])) {
        return '';
    }

    $game_id   = esc_attr($attributes['gameId']);
    $page_url  = esc_url($attributes['url']);
    $link_text = esc_html($attributes['linkText']);

    $default_bg     = 'ffffff';
    $default_fg     = '222222';
    $default_link   = 'fa5c5c';
    $default_border = 'dadada';

    $query_args = array();

    if (!empty($attributes['isDark'])) {
        $query_args['dark'] = 'true';
    }

    if (!empty($attributes['bgColor'])) {
        $clean_bg = strtolower(itchio_clean_hex($attributes['bgColor']));
        if ($clean_bg !== $default_bg) {
            $query_args['bg_color'] = $clean_bg;
        }
    }

    if (!empty($attributes['fgColor'])) {
        $clean_fg = strtolower(itchio_clean_hex($attributes['fgColor']));
        if ($clean_fg !== $default_fg) {
            $query_args['fg_color'] = $clean_fg;
        }
    }

    if (!empty($attributes['linkColor'])) {
        $clean_link = strtolower(itchio_clean_hex($attributes['linkColor']));
        if ($clean_link !== $default_link) {
            $query_args['link_color'] = $clean_link;
        }
    }

    if (!empty($attributes['borderColor'])) {
        $clean_border = strtolower(itchio_clean_hex($attributes['borderColor']));
        if ($clean_border !== $default_border) {
            $query_args['border_color'] = $clean_border;
        }
    }

    if (!empty($attributes['borderWidth'])) {
        $query_args['border_width'] = (int)$attributes['borderWidth'];
    }

    $embed_src = add_query_arg($query_args, 'https://itch.io/embed/' . $game_id);

    $extra_border = !empty($attributes['borderWidth']) ? ((int)$attributes['borderWidth'] * 2) : 0;
    $width        = 552 + $extra_border;
    $height       = 167 + $extra_border;

    $p_top    = !empty($attributes['paddingTop']) ? (int)$attributes['paddingTop'] : 0;
    $p_right  = !empty($attributes['paddingRight']) ? (int)$attributes['paddingRight'] : 0;
    $p_bottom = !empty($attributes['paddingBottom']) ? (int)$attributes['paddingBottom'] : 0;
    $p_left   = !empty($attributes['paddingLeft']) ? (int)$attributes['paddingLeft'] : 0;

    $max_width = $width + $p_left + $p_right;
    $padding_style = "padding: {$p_top}px {$p_right}px {$p_bottom}px {$p_left}px;";

    ob_start();
    ?>
<div style="max-width: <?php echo esc_attr($max_width); ?>px; <?php echo esc_attr($padding_style); ?> box-sizing: content-box;">
        <iframe
            src="<?php echo esc_url($embed_src); ?>"
            width="<?php echo esc_attr($width); ?>"
            height="<?php echo esc_attr($height); ?>"
            frameborder="0"
            allowfullscreen
            style="width: 100%; max-width: <?php echo esc_attr($width); ?>px; border: 0; display: block;">
            <a href="<?php echo esc_url($page_url); ?>">
                <?php echo esc_html($link_text); ?>
            </a>
        </iframe>
    </div>
    <?php
    return ob_get_clean();
}