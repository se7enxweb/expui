<?php
/**
 * @package expUI
 * @class   expuiInfo
 **/

class expuiInfo
{
    public static function info()
    {
        return array(
            'Name'      => '<a href="https://github.com/se7enxweb/expui">Exponential UI : jQuery 4 API for the admin and the site designs</a>',
            'Version'   => '1.0.0.1',
            'Author'    => '7x',
            'Copyright' => 'Copyright &copy; 2026 - ' . date( 'Y' ) . ' <a href="https://se7enx.com" target="blank">7x</a>',
            'License'   => "GNU General Public License v2.0 (or any later version)",
            'info_url'  => 'https://github.com/se7enxweb/expui',
            'Includes the following third-party software' => array(
                'Name'    => 'jQuery 4.0.0 and jQuery Migrate 4.0.2',
                'Version' => '4.0.0',
                'Copyright' => 'Copyright OpenJS Foundation and other contributors',
                'License' => 'MIT License',
            ),
        );
    }
}
