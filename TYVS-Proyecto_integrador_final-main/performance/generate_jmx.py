#!/usr/bin/env python3
"""Genera performance/ParkControl_LoadTest.jmx

Plan de pruebas JMeter para ParkControl con 5 escenarios parametrizados por
propiedades (${__P(...)}), ejecucion serializada, assertions por codigo HTTP,
generacion de placa unica por iteracion y listeners.

Endpoints reales (src/server/app.js):
  GET  /api/dashboard  -> 200
  POST /api/entries    -> 201   body {plate,vehicleType,ownerName,entryTime}
  POST /api/exits      -> 200   body {plate,exitTime}

Compatible con Apache JMeter 5.x (GUI/no-GUI). Se evita el uso de funciones
nuevas (p. ej. __timeShift) para maximizar compatibilidad: los timestamps son
fixtures fijas (exit > entry).
"""
import os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                   "ParkControl_LoadTest.jmx")

ENTRY_TIME = "2026-06-16T08:00:00.000Z"
EXIT_TIME = "2026-06-16T09:00:00.000Z"
# Placa unica y valida (4-10 alfanum.): <PFX><hilo>-<contador-por-hilo>.
# El prefijo por escenario evita colisiones de placa entre fases.
def plate(pfx):
    return f"{pfx}${{__threadNum}}-${{__counter(TRUE,)}}"


def save_config():
    return (
        '<objProp><name>saveConfig</name>'
        '<value class="SampleSaveConfiguration">'
        '<time>true</time><latency>true</latency><timestamp>true</timestamp>'
        '<success>true</success><label>true</label><code>true</code>'
        '<message>true</message><threadName>true</threadName>'
        '<dataType>true</dataType><encoding>false</encoding>'
        '<assertions>true</assertions><subresults>true</subresults>'
        '<responseData>false</responseData><samplerData>false</samplerData>'
        '<xml>false</xml><fieldNames>true</fieldNames>'
        '<responseHeaders>false</responseHeaders>'
        '<requestHeaders>false</requestHeaders>'
        '<responseDataOnError>false</responseDataOnError>'
        '<saveAssertionResultsFailureMessage>true'
        '</saveAssertionResultsFailureMessage>'
        '<assertionsResultsToSave>0</assertionsResultsToSave>'
        '<bytes>true</bytes><threadCounts>true</threadCounts>'
        '<idleTime>true</idleTime></value></objProp>'
    )


def assertion(code):
    return f'''<ResponseAssertion guiclass="AssertionGui" testclass="ResponseAssertion" testname="Assert HTTP {code}" enabled="true">
  <collectionProp name="Asserion.test_strings">
    <stringProp name="assert_code">{code}</stringProp>
  </collectionProp>
  <stringProp name="Assertion.custom_message">Codigo HTTP inesperado</stringProp>
  <stringProp name="Assertion.test_field">Assertion.response_code</stringProp>
  <boolProp name="Assertion.assume_success">false</boolProp>
  <intProp name="Assertion.test_type">8</intProp>
</ResponseAssertion>
<hashTree/>'''


def http_sampler(name, method, path, body=None):
    if body is not None:
        post_body = f'''<boolProp name="HTTPSampler.postBodyRaw">true</boolProp>
        <elementProp name="HTTPsampler.Arguments" elementType="Arguments">
          <collectionProp name="Arguments.arguments">
            <elementProp name="" elementType="HTTPArgument">
              <boolProp name="HTTPArgument.always_encode">false</boolProp>
              <stringProp name="Argument.value">{body}</stringProp>
              <stringProp name="Argument.metadata">=</stringProp>
            </elementProp>
          </collectionProp>
        </elementProp>'''
    else:
        post_body = '''<elementProp name="HTTPsampler.Arguments" elementType="Arguments">
          <collectionProp name="Arguments.arguments"/>
        </elementProp>'''
    return f'''<HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="{name}" enabled="true">
        {post_body}
        <stringProp name="HTTPSampler.domain"></stringProp>
        <stringProp name="HTTPSampler.port"></stringProp>
        <stringProp name="HTTPSampler.protocol"></stringProp>
        <stringProp name="HTTPSampler.path">{path}</stringProp>
        <stringProp name="HTTPSampler.method">{method}</stringProp>
        <boolProp name="HTTPSampler.follow_redirects">true</boolProp>
        <boolProp name="HTTPSampler.use_keepalive">true</boolProp>
        <stringProp name="HTTPSampler.connect_timeout">${{__P(http.connect_timeout,2000)}}</stringProp>
        <stringProp name="HTTPSampler.response_timeout">${{__P(http.response_timeout,10000)}}</stringProp>
      </HTTPSamplerProxy>'''


def thread_group(name, prop, samplers_xml):
    return f'''<ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="{name}" enabled="true">
        <stringProp name="ThreadGroup.num_threads">${{__P({prop}.threads,10)}}</stringProp>
        <stringProp name="ThreadGroup.ramp_time">${{__P({prop}.rampup,5)}}</stringProp>
        <boolProp name="ThreadGroup.scheduler">true</boolProp>
        <stringProp name="ThreadGroup.duration">${{__P({prop}.duration,20)}}</stringProp>
        <stringProp name="ThreadGroup.delay">0</stringProp>
        <elementProp name="ThreadGroup.main_controller" elementType="LoopController" guiclass="LoopControlPanel" testclass="LoopController" testname="Loop Controller" enabled="true">
          <boolProp name="LoopController.continue_forever">false</boolProp>
          <stringProp name="LoopController.loops">-1</stringProp>
        </elementProp>
        <stringProp name="ThreadGroup.on_sample_error">continue</stringProp>
      </ThreadGroup>
      <hashTree>
{samplers_xml}
      </hashTree>'''


def entry_body(pfx):
    return ('{"plate":"' + plate(pfx) + '","vehicleType":"car",'
            '"ownerName":"Carga JMeter","entryTime":"' + ENTRY_TIME + '"}')


def exit_body(pfx):
    return '{"plate":"' + plate(pfx) + '","exitTime":"' + EXIT_TIME + '"}'


def write_flow(scn, pfx):
    e = http_sampler(f"{scn} - POST /api/entries", "POST", "/api/entries", entry_body(pfx))
    x = http_sampler(f"{scn} - POST /api/exits", "POST", "/api/exits", exit_body(pfx))
    return (f'        {e}\n        <hashTree>\n          {assertion(201)}\n'
            f'        </hashTree>\n'
            f'        {x}\n        <hashTree>\n          {assertion(200)}\n'
            f'        </hashTree>')


def read_flow(scn):
    g = http_sampler(f"{scn} - GET /api/dashboard", "GET", "/api/dashboard")
    return (f'        {g}\n        <hashTree>\n          {assertion(200)}\n'
            f'        </hashTree>')


groups = []
groups.append(thread_group("1 - Baseline (lectura dashboard)", "baseline",
                           read_flow("Baseline")))
groups.append(thread_group("2 - Load (flujo ingreso/salida)", "load",
                           write_flow("Load", "LD")))
groups.append(thread_group("3 - Stress (flujo ingreso/salida)", "stress",
                           write_flow("Stress", "ST")))
groups.append(thread_group("4 - Spike (flujo ingreso/salida)", "spike",
                           write_flow("Spike", "SP")))
groups.append(thread_group("5 - Soak (flujo ingreso/salida)", "soak",
                           write_flow("Soak", "SK")))
groups_xml = "\n      ".join(groups)

listeners = f'''<ResultCollector guiclass="SummaryReport" testclass="ResultCollector" testname="Summary Report" enabled="true">
        <boolProp name="ResultCollector.error_logging">false</boolProp>
        {save_config()}
        <stringProp name="filename"></stringProp>
      </ResultCollector>
      <hashTree/>
      <ResultCollector guiclass="StatVisualizer" testclass="ResultCollector" testname="Aggregate Report" enabled="true">
        <boolProp name="ResultCollector.error_logging">false</boolProp>
        {save_config()}
        <stringProp name="filename"></stringProp>
      </ResultCollector>
      <hashTree/>
      <ResultCollector guiclass="ViewResultsFullVisualizer" testclass="ResultCollector" testname="View Results Tree" enabled="false">
        <boolProp name="ResultCollector.error_logging">false</boolProp>
        {save_config()}
        <stringProp name="filename"></stringProp>
      </ResultCollector>
      <hashTree/>'''

jmx = f'''<?xml version="1.0" encoding="UTF-8"?>
<jmeterTestPlan version="1.2" properties="2.8" jmeter="5.6.3">
  <hashTree>
    <TestPlan guiclass="TestPlanGui" testclass="TestPlan" testname="ParkControl - Plan de pruebas de carga y rendimiento" enabled="true">
      <boolProp name="TestPlan.functional_mode">false</boolProp>
      <boolProp name="TestPlan.serialize_threadgroups">true</boolProp>
      <elementProp name="TestPlan.user_defined_variables" elementType="Arguments" guiclass="ArgumentsPanel" testclass="Arguments" testname="Variables" enabled="true">
        <collectionProp name="Arguments.arguments"/>
      </elementProp>
      <stringProp name="TestPlan.comments">5 escenarios: Baseline, Load, Stress, Spike, Soak. Parametrizados por -J propiedades.</stringProp>
    </TestPlan>
    <hashTree>
      <ConfigTestElement guiclass="HttpDefaultsGui" testclass="ConfigTestElement" testname="HTTP Request Defaults" enabled="true">
        <elementProp name="HTTPsampler.Arguments" elementType="Arguments">
          <collectionProp name="Arguments.arguments"/>
        </elementProp>
        <stringProp name="HTTPSampler.domain">${{__P(host,127.0.0.1)}}</stringProp>
        <stringProp name="HTTPSampler.port">${{__P(port,3000)}}</stringProp>
        <stringProp name="HTTPSampler.protocol">http</stringProp>
      </ConfigTestElement>
      <hashTree/>
      <HeaderManager guiclass="HeaderPanel" testclass="HeaderManager" testname="HTTP Header Manager" enabled="true">
        <collectionProp name="HeaderManager.headers">
          <elementProp name="" elementType="Header">
            <stringProp name="Header.name">Content-Type</stringProp>
            <stringProp name="Header.value">application/json</stringProp>
          </elementProp>
        </collectionProp>
      </HeaderManager>
      <hashTree/>
      {groups_xml}
      {listeners}
    </hashTree>
  </hashTree>
</jmeterTestPlan>
'''

with open(OUT, "w") as f:
    f.write(jmx)
print(f"Generado {OUT} ({len(jmx)} bytes)")
