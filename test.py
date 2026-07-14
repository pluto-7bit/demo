from selenium import webdriver
from selenium.webdriver.edge.service import Service
from selenium.webdriver.edge.options import Options
import pytest

# 全局配置：Edge浏览器驱动路径（和你的msedgedriver.exe位置对应）
DRIVER_PATH = "msedgedriver.exe"

# pytest fixture：浏览器实例，每个用例执行前后自动启动/关闭浏览器
@pytest.fixture(scope="function")
def driver():
    # 配置Edge启动参数（提速用）
    edge_options = Options()
    edge_options.add_argument("--disable-gpu")
    edge_options.add_argument("--disable-images")
    edge_options.add_argument("--no-sandbox")

    # 启动浏览器
    driver = webdriver.Edge(service=Service(DRIVER_PATH), options=edge_options)
    driver.maximize_window()
    driver.implicitly_wait(10)  # 隐式等待，避免元素找不到报错

    yield driver  # 把driver传给测试用例

    # 测试用例执行完后，自动关闭浏览器
    driver.quit()

# 测试用例1：打开百度并验证标题
def test_open_baidu(driver):
    driver.get("https://www.baidu.com")
    assert "百度一下" in driver.title, "百度页面标题不符合预期"

# 测试用例2：打开B站并验证标题
def test_open_bilibili(driver):
    driver.get("https://www.bilibili.com")
    assert "哔哩哔哩" in driver.title, "B站页面标题不符合预期"