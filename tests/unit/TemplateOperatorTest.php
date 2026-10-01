<?php
/**
 * The exp_config() template operator.
 */

use PHPUnit\Framework\TestCase;

final class TemplateOperatorTest extends TestCase
{
    public function testOperatorList()
    {
        $op = new expUITemplateOperators();
        $this->assertSame( array( 'exp_config' ), $op->operatorList() );
        $this->assertTrue( $op->namedParameterPerOperator() );
        $this->assertArrayHasKey( 'options', $op->namedParameterList()['exp_config'] );
    }

    public function testModifyWritesTheConfigBlock()
    {
        $op = new expUITemplateOperators();
        $value = null;
        $op->modify( null, 'exp_config', array(), '', '', $value, array( 'options' => array( 'strings' => array( 'Extra' ), 'prefs' => array( 'bad name' ) ) ) );
        $this->assertStringStartsWith( '<script type="application/json" id="exp-config">', $value );
        $data = json_decode( substr( $value, strlen( '<script type="application/json" id="exp-config">' ), -strlen( '</script>' ) ), true );
        $this->assertArrayHasKey( 'Extra', $data['strings'] );
        $this->assertSame( array(), $data['prefs'] );
    }

    public function testModifyWithoutOptions()
    {
        $op = new expUITemplateOperators();
        $value = null;
        $op->modify( null, 'exp_config', array(), '', '', $value, array( 'options' => array() ) );
        $this->assertStringContainsString( '"config"', $value );
    }
}
